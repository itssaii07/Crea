// Health Check and Monitoring System
const { supabase } = require('../config/supabase');
const os = require('os');
const fs = require('fs');
const path = require('path');

class HealthCheck {
  constructor() {
    this.startTime = Date.now();
    this.checks = new Map();
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      memoryUsage: [],
      cpuUsage: []
    };
  }

  // Add a health check
  addCheck(name, checkFunction, interval = 60000) {
    this.checks.set(name, {
      function: checkFunction,
      interval: interval,
      lastRun: 0,
      status: 'unknown',
      lastError: null,
      lastResult: null
    });
  }

  // Run all health checks
  async runAllChecks() {
    const results = {};
    
    for (const [name, check] of this.checks) {
      try {
        const now = Date.now();
        if (now - check.lastRun >= check.interval) {
          check.lastResult = await check.function();
          check.status = 'healthy';
          check.lastRun = now;
          check.lastError = null;
        }
        results[name] = {
          status: check.status,
          lastRun: check.lastRun,
          result: check.lastResult,
          error: check.lastError
        };
      } catch (error) {
        check.status = 'unhealthy';
        check.lastError = error.message;
        results[name] = {
          status: 'unhealthy',
          lastRun: check.lastRun,
          error: error.message
        };
      }
    }
    
    return results;
  }

  // Database connectivity check
  async checkDatabase() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (error) throw error;
      
      return {
        connected: true,
        responseTime: Date.now() - this.startTime
      };
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  // Storage connectivity check
  async checkStorage() {
    try {
      const { data, error } = await supabase.storage
        .from('avatars')
        .list('', { limit: 1 });
      
      if (error) throw error;
      
      return {
        connected: true,
        accessible: true
      };
    } catch (error) {
      throw new Error(`Storage connection failed: ${error.message}`);
    }
  }

  // Memory usage check
  async checkMemory() {
    const usage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;
    const processMemoryPercent = (usage.heapUsed / totalMemory) * 100;
    
    return {
      total: this.formatBytes(totalMemory),
      used: this.formatBytes(usedMemory),
      free: this.formatBytes(freeMemory),
      usagePercent: Math.round(memoryUsagePercent * 100) / 100,
      process: {
        rss: this.formatBytes(usage.rss),
        heapTotal: this.formatBytes(usage.heapTotal),
        heapUsed: this.formatBytes(usage.heapUsed),
        external: this.formatBytes(usage.external),
        usagePercent: Math.round(processMemoryPercent * 100) / 100
      }
    };
  }

  // CPU usage check
  async checkCPU() {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    
    return {
      cores: cpus.length,
      loadAverage: {
        '1min': loadAvg[0],
        '5min': loadAvg[1],
        '15min': loadAvg[2]
      },
      cpuInfo: cpus.map(cpu => ({
        model: cpu.model,
        speed: cpu.speed
      }))
    };
  }

  // Disk usage check
  async checkDisk() {
    try {
      const stats = fs.statSync(process.cwd());
      const backupDir = path.join(__dirname, '../backups');
      let backupSize = 0;
      
      if (fs.existsSync(backupDir)) {
        const files = fs.readdirSync(backupDir);
        for (const file of files) {
          const filePath = path.join(backupDir, file);
          const fileStats = fs.statSync(filePath);
          backupSize += fileStats.size;
        }
      }
      
      return {
        backupSize: this.formatBytes(backupSize),
        backupFiles: fs.existsSync(backupDir) ? fs.readdirSync(backupDir).length : 0
      };
    } catch (error) {
      throw new Error(`Disk check failed: ${error.message}`);
    }
  }

  // API response time check
  async checkAPIResponseTime() {
    const start = Date.now();
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 10));
      const responseTime = Date.now() - start;
      
      this.metrics.responseTime.push(responseTime);
      if (this.metrics.responseTime.length > 100) {
        this.metrics.responseTime = this.metrics.responseTime.slice(-100);
      }
      
      return {
        responseTime: responseTime,
        averageResponseTime: this.getAverageResponseTime()
      };
    } catch (error) {
      throw new Error(`API response time check failed: ${error.message}`);
    }
  }

  // Get overall health status
  async getHealthStatus() {
    const checks = await this.runAllChecks();
    const overallStatus = this.determineOverallStatus(checks);
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      checks: checks,
      metrics: this.getMetrics()
    };
  }

  // Determine overall status
  determineOverallStatus(checks) {
    const statuses = Object.values(checks).map(check => check.status);
    
    if (statuses.includes('unhealthy')) {
      return 'unhealthy';
    } else if (statuses.includes('unknown')) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  // Get uptime
  getUptime() {
    const uptime = Date.now() - this.startTime;
    return {
      milliseconds: uptime,
      seconds: Math.floor(uptime / 1000),
      minutes: Math.floor(uptime / (1000 * 60)),
      hours: Math.floor(uptime / (1000 * 60 * 60)),
      days: Math.floor(uptime / (1000 * 60 * 60 * 24))
    };
  }

  // Get metrics
  getMetrics() {
    return {
      requests: this.metrics.requests,
      errors: this.metrics.errors,
      errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests) * 100 : 0,
      averageResponseTime: this.getAverageResponseTime(),
      memoryUsage: this.metrics.memoryUsage.slice(-10), // Last 10 measurements
      cpuUsage: this.metrics.cpuUsage.slice(-10) // Last 10 measurements
    };
  }

  // Get average response time
  getAverageResponseTime() {
    if (this.metrics.responseTime.length === 0) return 0;
    return Math.round(
      this.metrics.responseTime.reduce((sum, time) => sum + time, 0) / this.metrics.responseTime.length
    );
  }

  // Record request
  recordRequest(responseTime, isError = false) {
    this.metrics.requests++;
    if (isError) this.metrics.errors++;
    if (responseTime) {
      this.metrics.responseTime.push(responseTime);
      if (this.metrics.responseTime.length > 100) {
        this.metrics.responseTime = this.metrics.responseTime.slice(-100);
      }
    }
  }

  // Record memory usage
  recordMemoryUsage() {
    const usage = process.memoryUsage();
    this.metrics.memoryUsage.push({
      timestamp: Date.now(),
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external
    });
    
    if (this.metrics.memoryUsage.length > 100) {
      this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-100);
    }
  }

  // Format bytes
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Initialize default checks
  initializeDefaultChecks() {
    this.addCheck('database', () => this.checkDatabase(), 30000);
    this.addCheck('storage', () => this.checkStorage(), 60000);
    this.addCheck('memory', () => this.checkMemory(), 30000);
    this.addCheck('cpu', () => this.checkCPU(), 60000);
    this.addCheck('disk', () => this.checkDisk(), 300000);
    this.addCheck('api', () => this.checkAPIResponseTime(), 10000);
  }
}

module.exports = HealthCheck;
