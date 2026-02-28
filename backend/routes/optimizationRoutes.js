const express = require('express');
const auth = require('../middleware/auth');
const QueryOptimizer = require('../optimization/queryOptimizer');
const IndexManager = require('../optimization/indexManager');

const router = express.Router();
const queryOptimizer = new QueryOptimizer();
const indexManager = new IndexManager();

// Admin middleware
const adminAuth = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Get query performance statistics
router.get('/queries/stats', auth, adminAuth, async (req, res) => {
  try {
    const stats = queryOptimizer.getQueryStats();
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('Get query stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get query statistics'
    });
  }
});

// Get slow queries
router.get('/queries/slow', auth, adminAuth, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const slowQueries = queryOptimizer.getSlowQueries(parseInt(limit));
    
    res.json({
      success: true,
      slowQueries: slowQueries,
      count: slowQueries.length
    });
  } catch (error) {
    console.error('Get slow queries error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get slow queries'
    });
  }
});

// Get performance metrics
router.get('/queries/metrics', auth, adminAuth, async (req, res) => {
  try {
    const metrics = queryOptimizer.getPerformanceMetrics();
    res.json({
      success: true,
      metrics: metrics
    });
  } catch (error) {
    console.error('Get performance metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get performance metrics'
    });
  }
});

// Get optimization report
router.get('/queries/report', auth, adminAuth, async (req, res) => {
  try {
    const report = queryOptimizer.getOptimizationReport();
    res.json({
      success: true,
      report: report
    });
  } catch (error) {
    console.error('Get optimization report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get optimization report'
    });
  }
});

// Clear query statistics
router.post('/queries/clear', auth, adminAuth, async (req, res) => {
  try {
    queryOptimizer.clearStats();
    res.json({
      success: true,
      message: 'Query statistics cleared'
    });
  } catch (error) {
    console.error('Clear query stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear query statistics'
    });
  }
});

// Export query statistics
router.get('/queries/export', auth, adminAuth, async (req, res) => {
  try {
    const stats = queryOptimizer.exportStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Export query stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export query statistics'
    });
  }
});

// Get all indexes
router.get('/indexes', auth, adminAuth, async (req, res) => {
  try {
    const indexes = indexManager.getAllIndexes();
    res.json({
      success: true,
      indexes: indexes,
      count: indexes.length
    });
  } catch (error) {
    console.error('Get indexes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get indexes'
    });
  }
});

// Get indexes by table
router.get('/indexes/table/:tableName', auth, adminAuth, async (req, res) => {
  try {
    const { tableName } = req.params;
    const indexes = indexManager.getIndexesByTable(tableName);
    
    res.json({
      success: true,
      table: tableName,
      indexes: indexes,
      count: indexes.length
    });
  } catch (error) {
    console.error('Get table indexes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get table indexes'
    });
  }
});

// Get indexes by priority
router.get('/indexes/priority/:priority', auth, adminAuth, async (req, res) => {
  try {
    const { priority } = req.params;
    const indexes = indexManager.getIndexesByPriority(priority);
    
    res.json({
      success: true,
      priority: priority,
      indexes: indexes,
      count: indexes.length
    });
  } catch (error) {
    console.error('Get priority indexes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get priority indexes'
    });
  }
});

// Create index
router.post('/indexes/:indexName', auth, adminAuth, async (req, res) => {
  try {
    const { indexName } = req.params;
    const result = await indexManager.createIndex(indexName);
    
    res.json({
      success: result.success,
      message: result.message,
      error: result.error,
      sql: result.sql
    });
  } catch (error) {
    console.error('Create index error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create index'
    });
  }
});

// Drop index
router.delete('/indexes/:indexName', auth, adminAuth, async (req, res) => {
  try {
    const { indexName } = req.params;
    const result = await indexManager.dropIndex(indexName);
    
    res.json({
      success: result.success,
      message: result.message,
      error: result.error,
      sql: result.sql
    });
  } catch (error) {
    console.error('Drop index error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to drop index'
    });
  }
});

// Create all indexes
router.post('/indexes/create-all', auth, adminAuth, async (req, res) => {
  try {
    const results = await indexManager.createAllIndexes();
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    res.json({
      success: true,
      message: `Created ${successful} indexes, ${failed} failed`,
      results: results,
      summary: {
        total: results.length,
        successful: successful,
        failed: failed
      }
    });
  } catch (error) {
    console.error('Create all indexes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create all indexes'
    });
  }
});

// Analyze table
router.get('/indexes/analyze/:tableName', auth, adminAuth, async (req, res) => {
  try {
    const { tableName } = req.params;
    const analysis = await indexManager.analyzeTable(tableName);
    
    res.json({
      success: true,
      analysis: analysis
    });
  } catch (error) {
    console.error('Analyze table error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze table'
    });
  }
});

// Get index usage statistics
router.get('/indexes/usage', auth, adminAuth, async (req, res) => {
  try {
    const usageStats = await indexManager.getIndexUsageStats();
    res.json({
      success: true,
      usageStats: usageStats
    });
  } catch (error) {
    console.error('Get index usage stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get index usage statistics'
    });
  }
});

// Optimize indexes
router.post('/indexes/optimize', auth, adminAuth, async (req, res) => {
  try {
    const recommendations = await indexManager.optimizeIndexes();
    res.json({
      success: true,
      recommendations: recommendations,
      count: recommendations.length
    });
  } catch (error) {
    console.error('Optimize indexes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to optimize indexes'
    });
  }
});

// Get maintenance report
router.get('/indexes/report', auth, adminAuth, async (req, res) => {
  try {
    const report = await indexManager.getMaintenanceReport();
    res.json({
      success: true,
      report: report
    });
  } catch (error) {
    console.error('Get maintenance report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get maintenance report'
    });
  }
});

// Generate index SQL
router.get('/indexes/sql', auth, adminAuth, async (req, res) => {
  try {
    const { indexName } = req.query;
    
    if (indexName) {
      const index = indexManager.indexes.get(indexName);
      if (!index) {
        return res.status(404).json({
          success: false,
          error: 'Index not found'
        });
      }
      
      const sql = indexManager.generateCreateIndexSQL(indexName, index);
      res.json({
        success: true,
        indexName: indexName,
        sql: sql
      });
    } else {
      const allSql = indexManager.generateAllIndexSQL();
      res.json({
        success: true,
        sql: allSql
      });
    }
  } catch (error) {
    console.error('Generate index SQL error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate index SQL'
    });
  }
});

// Add custom index
router.post('/indexes/custom', auth, adminAuth, async (req, res) => {
  try {
    const { name, table, columns, options = {} } = req.body;
    
    if (!name || !table || !columns) {
      return res.status(400).json({
        success: false,
        error: 'Name, table, and columns are required'
      });
    }
    
    indexManager.addIndex(name, table, columns, options);
    
    res.json({
      success: true,
      message: 'Custom index added',
      index: {
        name,
        table,
        columns: Array.isArray(columns) ? columns : [columns],
        ...options
      }
    });
  } catch (error) {
    console.error('Add custom index error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add custom index'
    });
  }
});

// Remove custom index
router.delete('/indexes/custom/:indexName', auth, adminAuth, async (req, res) => {
  try {
    const { indexName } = req.params;
    const removed = indexManager.removeIndex(indexName);
    
    if (removed) {
      res.json({
        success: true,
        message: 'Custom index removed'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Index not found'
      });
    }
  } catch (error) {
    console.error('Remove custom index error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove custom index'
    });
  }
});

module.exports = router;
