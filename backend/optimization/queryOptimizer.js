// Query Optimization and Performance Monitoring
const { supabase } = require('../config/supabase');

class QueryOptimizer {
  constructor() {
    this.queryStats = new Map();
    this.slowQueries = [];
    this.indexRecommendations = new Map();
    this.performanceMetrics = {
      totalQueries: 0,
      slowQueries: 0,
      averageResponseTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    
    this.slowQueryThreshold = 1000; // 1 second
    this.maxSlowQueries = 1000;
  }

  // Track query performance
  async trackQuery(queryName, queryFunction, options = {}) {
    const startTime = Date.now();
    let result = null;
    let error = null;

    try {
      result = await queryFunction();
      this.performanceMetrics.totalQueries++;
    } catch (err) {
      error = err;
      this.performanceMetrics.totalQueries++;
    }

    const executionTime = Date.now() - startTime;
    const isSlow = executionTime > this.slowQueryThreshold;

    // Update query stats
    this.updateQueryStats(queryName, executionTime, isSlow, error);

    // Track slow queries
    if (isSlow) {
      this.trackSlowQuery(queryName, executionTime, error, options);
    }

    // Update performance metrics
    this.updatePerformanceMetrics(executionTime);

    if (error) {
      throw error;
    }

    return result;
  }

  // Update query statistics
  updateQueryStats(queryName, executionTime, isSlow, error) {
    if (!this.queryStats.has(queryName)) {
      this.queryStats.set(queryName, {
        count: 0,
        totalTime: 0,
        averageTime: 0,
        slowQueries: 0,
        errors: 0,
        lastExecuted: null,
        minTime: Infinity,
        maxTime: 0
      });
    }

    const stats = this.queryStats.get(queryName);
    stats.count++;
    stats.totalTime += executionTime;
    stats.averageTime = stats.totalTime / stats.count;
    stats.lastExecuted = new Date().toISOString();
    stats.minTime = Math.min(stats.minTime, executionTime);
    stats.maxTime = Math.max(stats.maxTime, executionTime);

    if (isSlow) {
      stats.slowQueries++;
    }

    if (error) {
      stats.errors++;
    }

    this.queryStats.set(queryName, stats);
  }

  // Track slow query
  trackSlowQuery(queryName, executionTime, error, options) {
    const slowQuery = {
      queryName,
      executionTime,
      timestamp: new Date().toISOString(),
      error: error?.message,
      options: options
    };

    this.slowQueries.push(slowQuery);
    this.performanceMetrics.slowQueries++;

    // Keep only the most recent slow queries
    if (this.slowQueries.length > this.maxSlowQueries) {
      this.slowQueries = this.slowQueries.slice(-this.maxSlowQueries);
    }
  }

  // Update performance metrics
  updatePerformanceMetrics(executionTime) {
    const totalQueries = this.performanceMetrics.totalQueries;
    const currentAvg = this.performanceMetrics.averageResponseTime;
    
    // Calculate rolling average
    this.performanceMetrics.averageResponseTime = 
      (currentAvg * (totalQueries - 1) + executionTime) / totalQueries;
  }

  // Get query statistics
  getQueryStats() {
    const stats = {};
    for (const [queryName, queryStats] of this.queryStats) {
      stats[queryName] = {
        ...queryStats,
        slowQueryRate: (queryStats.slowQueries / queryStats.count) * 100,
        errorRate: (queryStats.errors / queryStats.count) * 100
      };
    }
    return stats;
  }

  // Get slow queries
  getSlowQueries(limit = 50) {
    return this.slowQueries
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, limit);
  }

  // Get performance metrics
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      slowQueryRate: (this.performanceMetrics.slowQueries / this.performanceMetrics.totalQueries) * 100,
      cacheHitRate: this.performanceMetrics.cacheHits / (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses) * 100
    };
  }

  // Generate index recommendations
  generateIndexRecommendations() {
    const recommendations = [];
    const stats = this.getQueryStats();

    for (const [queryName, queryStats] of Object.entries(stats)) {
      if (queryStats.slowQueryRate > 10) { // More than 10% slow queries
        const recommendation = this.analyzeQueryForIndexes(queryName, queryStats);
        if (recommendation) {
          recommendations.push(recommendation);
        }
      }
    }

    return recommendations;
  }

  // Analyze query for index recommendations
  analyzeQueryForIndexes(queryName, queryStats) {
    // This is a simplified analysis - in practice, you'd analyze the actual query patterns
    const commonPatterns = {
      'getUserByEmail': {
        table: 'users',
        columns: ['email'],
        type: 'btree',
        reason: 'Frequent lookups by email'
      },
      'getRequestsByStatus': {
        table: 'requests',
        columns: ['status'],
        type: 'btree',
        reason: 'Frequent filtering by status'
      },
      'getRequestsByCategory': {
        table: 'requests',
        columns: ['category'],
        type: 'btree',
        reason: 'Frequent filtering by category'
      },
      'getMessagesByChatId': {
        table: 'messages',
        columns: ['chat_id', 'created_at'],
        type: 'btree',
        reason: 'Frequent ordering by chat and time'
      },
      'getActivitiesByUser': {
        table: 'activities',
        columns: ['user_id', 'created_at'],
        type: 'btree',
        reason: 'Frequent user activity queries with time ordering'
      },
      'getNotificationsByUser': {
        table: 'notifications',
        columns: ['user_id', 'is_read', 'created_at'],
        type: 'btree',
        reason: 'Frequent notification queries with filters'
      }
    };

    const pattern = commonPatterns[queryName];
    if (pattern) {
      return {
        queryName,
        recommendation: `CREATE INDEX idx_${pattern.table}_${pattern.columns.join('_')} ON ${pattern.table} (${pattern.columns.join(', ')});`,
        table: pattern.table,
        columns: pattern.columns,
        type: pattern.type,
        reason: pattern.reason,
        priority: queryStats.slowQueryRate > 50 ? 'high' : 'medium'
      };
    }

    return null;
  }

  // Optimize common queries
  async optimizedGetUserByEmail(email) {
    return await this.trackQuery('getUserByEmail', async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) throw error;
      return data;
    });
  }

  async optimizedGetRequests(filters = {}, options = {}) {
    return await this.trackQuery('getRequests', async () => {
      let query = supabase.from('requests').select('*');

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }
      if (filters.priceMin) {
        query = query.gte('price', filters.priceMin);
      }
      if (filters.priceMax) {
        query = query.lte('price', filters.priceMax);
      }

      // Apply ordering
      if (options.orderBy) {
        query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending !== false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    });
  }

  async optimizedGetUserChats(userId, limit = 20) {
    return await this.trackQuery('getUserChats', async () => {
      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          messages:messages(id, text, created_at, sender_id)
        `)
        .contains('participants', [userId])
        .order('last_message_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    });
  }

  async optimizedGetChatMessages(chatId, limit = 100) {
    return await this.trackQuery('getChatMessages', async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    });
  }

  async optimizedGetUserActivities(userId, limit = 50) {
    return await this.trackQuery('getUserActivities', async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    });
  }

  async optimizedGetUserNotifications(userId, unreadOnly = false) {
    return await this.trackQuery('getUserNotifications', async () => {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId);

      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data;
    });
  }

  // Search optimization
  async optimizedSearchRequests(searchTerm, filters = {}) {
    return await this.trackQuery('searchRequests', async () => {
      let query = supabase
        .from('requests')
        .select('*')
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,keywords.cs.{${searchTerm}}`);

      // Apply additional filters
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data;
    });
  }

  // Get optimization report
  getOptimizationReport() {
    const stats = this.getQueryStats();
    const slowQueries = this.getSlowQueries(20);
    const recommendations = this.generateIndexRecommendations();
    const metrics = this.getPerformanceMetrics();

    return {
      summary: {
        totalQueries: metrics.totalQueries,
        slowQueries: metrics.slowQueries,
        slowQueryRate: metrics.slowQueryRate,
        averageResponseTime: Math.round(metrics.averageResponseTime),
        cacheHitRate: metrics.cacheHitRate
      },
      slowQueries: slowQueries,
      recommendations: recommendations,
      queryStats: stats,
      generatedAt: new Date().toISOString()
    };
  }

  // Clear statistics
  clearStats() {
    this.queryStats.clear();
    this.slowQueries = [];
    this.performanceMetrics = {
      totalQueries: 0,
      slowQueries: 0,
      averageResponseTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  // Export statistics
  exportStats() {
    return {
      queryStats: Object.fromEntries(this.queryStats),
      slowQueries: this.slowQueries,
      performanceMetrics: this.performanceMetrics,
      exportedAt: new Date().toISOString()
    };
  }
}

module.exports = QueryOptimizer;
