const express = require('express');
const auth = require('../middleware/auth');
const HealthCheck = require('../monitoring/healthCheck');
const AlertManager = require('../monitoring/alerts');

const router = express.Router();
const healthCheck = new HealthCheck();
const alertManager = new AlertManager();

// Initialize default checks
healthCheck.initializeDefaultChecks();

// Admin middleware
const adminAuth = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Get health status
router.get('/health', auth, async (req, res) => {
  try {
    const healthStatus = await healthCheck.getHealthStatus();
    
    // Record this request
    healthCheck.recordRequest(Date.now() - req.startTime, false);
    
    res.json(healthStatus);
  } catch (error) {
    console.error('Health check error:', error);
    healthCheck.recordRequest(Date.now() - req.startTime, true);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Get detailed health status (admin only)
router.get('/health/detailed', auth, adminAuth, async (req, res) => {
  try {
    const healthStatus = await healthCheck.getHealthStatus();
    const alerts = alertManager.getActiveAlerts();
    const alertStats = alertManager.getAlertStats();
    
    res.json({
      ...healthStatus,
      alerts: {
        active: alerts,
        stats: alertStats
      }
    });
  } catch (error) {
    console.error('Detailed health check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Detailed health check failed',
      error: error.message
    });
  }
});

// Get metrics
router.get('/metrics', auth, adminAuth, async (req, res) => {
  try {
    const metrics = healthCheck.getMetrics();
    res.json({
      success: true,
      metrics: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get metrics'
    });
  }
});

// Get alerts
router.get('/alerts', auth, adminAuth, async (req, res) => {
  try {
    const { limit = 50, severity, rule, active } = req.query;
    
    let alerts = alertManager.getAlertHistory(parseInt(limit));
    
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }
    
    if (rule) {
      alerts = alerts.filter(alert => alert.rule === rule);
    }
    
    if (active === 'true') {
      alerts = alerts.filter(alert => !alert.resolved);
    }
    
    res.json({
      success: true,
      alerts: alerts,
      total: alerts.length
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get alerts'
    });
  }
});

// Get active alerts
router.get('/alerts/active', auth, adminAuth, async (req, res) => {
  try {
    const alerts = alertManager.getActiveAlerts();
    res.json({
      success: true,
      alerts: alerts,
      count: alerts.length
    });
  } catch (error) {
    console.error('Get active alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active alerts'
    });
  }
});

// Get alert statistics
router.get('/alerts/stats', auth, adminAuth, async (req, res) => {
  try {
    const stats = alertManager.getAlertStats();
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('Get alert stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get alert statistics'
    });
  }
});

// Add notification channel
router.post('/notifications/channels', auth, adminAuth, async (req, res) => {
  try {
    const { type, config } = req.body;
    
    if (!type || !config) {
      return res.status(400).json({
        success: false,
        error: 'Type and config are required'
      });
    }
    
    const channel = {
      id: `channel_${Date.now()}`,
      type: type,
      config: config,
      createdAt: new Date().toISOString()
    };
    
    alertManager.addNotificationChannel(channel);
    
    res.json({
      success: true,
      message: 'Notification channel added',
      channel: channel
    });
  } catch (error) {
    console.error('Add notification channel error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add notification channel'
    });
  }
});

// Remove notification channel
router.delete('/notifications/channels/:channelId', auth, adminAuth, async (req, res) => {
  try {
    const { channelId } = req.params;
    
    alertManager.removeNotificationChannel(channelId);
    
    res.json({
      success: true,
      message: 'Notification channel removed'
    });
  } catch (error) {
    console.error('Remove notification channel error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove notification channel'
    });
  }
});

// Add alert rule
router.post('/alerts/rules', auth, adminAuth, async (req, res) => {
  try {
    const { name, rule } = req.body;
    
    if (!name || !rule) {
      return res.status(400).json({
        success: false,
        error: 'Name and rule are required'
      });
    }
    
    alertManager.addAlertRule(name, rule);
    
    res.json({
      success: true,
      message: 'Alert rule added',
      rule: { name, ...rule }
    });
  } catch (error) {
    console.error('Add alert rule error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add alert rule'
    });
  }
});

// Remove alert rule
router.delete('/alerts/rules/:ruleName', auth, adminAuth, async (req, res) => {
  try {
    const { ruleName } = req.params;
    
    alertManager.removeAlertRule(ruleName);
    
    res.json({
      success: true,
      message: 'Alert rule removed'
    });
  } catch (error) {
    console.error('Remove alert rule error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove alert rule'
    });
  }
});

// Test alert rule
router.post('/alerts/rules/:ruleName/test', auth, adminAuth, async (req, res) => {
  try {
    const { ruleName } = req.params;
    const { testData } = req.body;
    
    const result = await alertManager.testAlertRule(ruleName, testData);
    
    res.json({
      success: true,
      result: result
    });
  } catch (error) {
    console.error('Test alert rule error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear resolved alerts
router.post('/alerts/clear', auth, adminAuth, async (req, res) => {
  try {
    const clearedCount = alertManager.clearResolvedAlerts();
    
    res.json({
      success: true,
      message: `Cleared ${clearedCount} resolved alerts`,
      clearedCount: clearedCount
    });
  } catch (error) {
    console.error('Clear alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear resolved alerts'
    });
  }
});

// Get system information
router.get('/system', auth, adminAuth, async (req, res) => {
  try {
    const os = require('os');
    const process = require('process');
    
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      uptime: process.uptime(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      },
      cpus: os.cpus().length,
      loadAverage: os.loadavg(),
      environment: process.env.NODE_ENV || 'development'
    };
    
    res.json({
      success: true,
      system: systemInfo
    });
  } catch (error) {
    console.error('Get system info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system information'
    });
  }
});

// Manual health check trigger
router.post('/health/check', auth, adminAuth, async (req, res) => {
  try {
    const healthStatus = await healthCheck.runAllChecks();
    
    // Check for alerts
    const metrics = healthCheck.getMetrics();
    const triggeredAlerts = await alertManager.checkAlerts(healthStatus, metrics);
    
    res.json({
      success: true,
      healthStatus: healthStatus,
      triggeredAlerts: triggeredAlerts,
      message: 'Health check completed'
    });
  } catch (error) {
    console.error('Manual health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Manual health check failed'
    });
  }
});

// Middleware to record request metrics
router.use((req, res, next) => {
  req.startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - req.startTime;
    const isError = res.statusCode >= 400;
    healthCheck.recordRequest(responseTime, isError);
  });
  
  next();
});

module.exports = router;
