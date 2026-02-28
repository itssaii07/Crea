// Alerting System for Monitoring
const { supabase } = require('../config/supabase');

class AlertManager {
  constructor() {
    this.alerts = new Map();
    this.alertHistory = [];
    this.notificationChannels = [];
    this.alertRules = new Map();
    
    this.initializeDefaultRules();
  }

  // Initialize default alert rules
  initializeDefaultRules() {
    // Memory usage alert
    this.addAlertRule('high_memory_usage', {
      condition: (metrics) => {
        const memoryUsage = metrics.memory?.process?.usagePercent || 0;
        return memoryUsage > 80;
      },
      severity: 'warning',
      message: 'High memory usage detected',
      cooldown: 300000 // 5 minutes
    });

    // Error rate alert
    this.addAlertRule('high_error_rate', {
      condition: (metrics) => {
        const errorRate = metrics.errorRate || 0;
        return errorRate > 10;
      },
      severity: 'critical',
      message: 'High error rate detected',
      cooldown: 60000 // 1 minute
    });

    // Response time alert
    this.addAlertRule('slow_response_time', {
      condition: (metrics) => {
        const avgResponseTime = metrics.averageResponseTime || 0;
        return avgResponseTime > 5000; // 5 seconds
      },
      severity: 'warning',
      message: 'Slow response time detected',
      cooldown: 300000 // 5 minutes
    });

    // Database connectivity alert
    this.addAlertRule('database_down', {
      condition: (healthStatus) => {
        return healthStatus.checks?.database?.status === 'unhealthy';
      },
      severity: 'critical',
      message: 'Database connection failed',
      cooldown: 60000 // 1 minute
    });

    // Storage connectivity alert
    this.addAlertRule('storage_down', {
      condition: (healthStatus) => {
        return healthStatus.checks?.storage?.status === 'unhealthy';
      },
      severity: 'critical',
      message: 'Storage connection failed',
      cooldown: 60000 // 1 minute
    });
  }

  // Add alert rule
  addAlertRule(name, rule) {
    this.alertRules.set(name, {
      ...rule,
      lastTriggered: 0,
      isActive: false
    });
  }

  // Remove alert rule
  removeAlertRule(name) {
    this.alertRules.delete(name);
  }

  // Check alerts against current metrics
  async checkAlerts(healthStatus, metrics) {
    const triggeredAlerts = [];

    for (const [ruleName, rule] of this.alertRules) {
      try {
        const now = Date.now();
        const canTrigger = now - rule.lastTriggered > rule.cooldown;
        
        if (canTrigger && rule.condition(healthStatus, metrics)) {
          const alert = {
            id: this.generateAlertId(),
            rule: ruleName,
            severity: rule.severity,
            message: rule.message,
            timestamp: new Date().toISOString(),
            healthStatus: healthStatus,
            metrics: metrics,
            resolved: false
          };

          triggeredAlerts.push(alert);
          rule.lastTriggered = now;
          rule.isActive = true;

          // Store alert
          this.alerts.set(alert.id, alert);
          this.alertHistory.push(alert);

          // Send notifications
          await this.sendNotifications(alert);
        } else if (!rule.condition(healthStatus, metrics) && rule.isActive) {
          // Alert resolved
          rule.isActive = false;
          await this.resolveAlert(ruleName, healthStatus);
        }
      } catch (error) {
        console.error(`Error checking alert rule ${ruleName}:`, error);
      }
    }

    return triggeredAlerts;
  }

  // Resolve alert
  async resolveAlert(ruleName, healthStatus) {
    const alert = {
      id: this.generateAlertId(),
      rule: ruleName,
      severity: 'info',
      message: `Alert resolved: ${ruleName}`,
      timestamp: new Date().toISOString(),
      healthStatus: healthStatus,
      resolved: true
    };

    this.alerts.set(alert.id, alert);
    this.alertHistory.push(alert);

    await this.sendNotifications(alert);
  }

  // Send notifications
  async sendNotifications(alert) {
    for (const channel of this.notificationChannels) {
      try {
        await this.sendToChannel(channel, alert);
      } catch (error) {
        console.error(`Failed to send notification via ${channel.type}:`, error);
      }
    }
  }

  // Send to specific notification channel
  async sendToChannel(channel, alert) {
    switch (channel.type) {
      case 'email':
        await this.sendEmailAlert(channel, alert);
        break;
      case 'webhook':
        await this.sendWebhookAlert(channel, alert);
        break;
      case 'database':
        await this.sendDatabaseAlert(channel, alert);
        break;
      case 'console':
        this.sendConsoleAlert(alert);
        break;
      default:
        console.warn(`Unknown notification channel type: ${channel.type}`);
    }
  }

  // Send email alert
  async sendEmailAlert(channel, alert) {
    console.log(`Email alert sent to ${channel.recipients}:`, alert.message);
  }

  // Send webhook alert
  async sendWebhookAlert(channel, alert) {
    try {
      const response = await fetch(channel.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': channel.auth ? `Bearer ${channel.auth}` : undefined
        },
        body: JSON.stringify({
          alert: alert,
          timestamp: new Date().toISOString(),
          source: 'crea-monitoring'
        })
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Webhook alert failed:', error);
    }
  }

  // Send database alert
  async sendDatabaseAlert(channel, alert) {
    try {
      const { error } = await supabase
        .from('alerts')
        .insert([{
          id: alert.id,
          rule: alert.rule,
          severity: alert.severity,
          message: alert.message,
          timestamp: alert.timestamp,
          resolved: alert.resolved,
          metadata: {
            healthStatus: alert.healthStatus,
            metrics: alert.metrics
          }
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Database alert failed:', error);
    }
  }

  // Send console alert
  sendConsoleAlert(alert) {
    const severityColors = {
      info: '\x1b[36m',    // Cyan
      warning: '\x1b[33m', // Yellow
      critical: '\x1b[31m', // Red
      error: '\x1b[31m'    // Red
    };
    
    const resetColor = '\x1b[0m';
    const color = severityColors[alert.severity] || '';
    
    console.log(`${color}[${alert.severity.toUpperCase()}] ${alert.message}${resetColor}`);
    console.log(`Rule: ${alert.rule}, Time: ${alert.timestamp}`);
  }

  // Add notification channel
  addNotificationChannel(channel) {
    this.notificationChannels.push(channel);
  }

  // Remove notification channel
  removeNotificationChannel(channelId) {
    this.notificationChannels = this.notificationChannels.filter(
      channel => channel.id !== channelId
    );
  }

  // Get active alerts
  getActiveAlerts() {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  // Get alert history
  getAlertHistory(limit = 100) {
    return this.alertHistory
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  // Get alerts by severity
  getAlertsBySeverity(severity) {
    return this.alertHistory.filter(alert => alert.severity === severity);
  }

  // Get alerts by rule
  getAlertsByRule(ruleName) {
    return this.alertHistory.filter(alert => alert.rule === ruleName);
  }

  // Clear resolved alerts
  clearResolvedAlerts() {
    const resolvedAlerts = Array.from(this.alerts.values()).filter(alert => alert.resolved);
    for (const alert of resolvedAlerts) {
      this.alerts.delete(alert.id);
    }
    return resolvedAlerts.length;
  }

  // Generate alert ID
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  // Get alert statistics
  getAlertStats() {
    const totalAlerts = this.alertHistory.length;
    const activeAlerts = this.getActiveAlerts().length;
    const resolvedAlerts = totalAlerts - activeAlerts;
    
    const severityCounts = {
      info: 0,
      warning: 0,
      critical: 0,
      error: 0
    };
    
    for (const alert of this.alertHistory) {
      severityCounts[alert.severity] = (severityCounts[alert.severity] || 0) + 1;
    }
    
    return {
      total: totalAlerts,
      active: activeAlerts,
      resolved: resolvedAlerts,
      bySeverity: severityCounts,
      notificationChannels: this.notificationChannels.length,
      alertRules: this.alertRules.size
    };
  }

  // Test alert rule
  async testAlertRule(ruleName, testData) {
    const rule = this.alertRules.get(ruleName);
    if (!rule) {
      throw new Error(`Alert rule ${ruleName} not found`);
    }
    
    try {
      const result = rule.condition(testData.healthStatus, testData.metrics);
      return {
        rule: ruleName,
        triggered: result,
        message: result ? rule.message : 'Rule did not trigger'
      };
    } catch (error) {
      throw new Error(`Error testing alert rule: ${error.message}`);
    }
  }
}

module.exports = AlertManager;
