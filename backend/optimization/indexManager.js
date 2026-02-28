// Database Index Management System
const { supabase } = require('../config/supabase');

class IndexManager {
  constructor() {
    this.indexes = new Map();
    this.initializeDefaultIndexes();
  }

  // Initialize default indexes
  initializeDefaultIndexes() {
    this.indexes.set('users_email', {
      table: 'users',
      columns: ['email'],
      type: 'btree',
      unique: true,
      reason: 'Fast user lookups by email',
      priority: 'high'
    });

    this.indexes.set('users_role', {
      table: 'users',
      columns: ['role'],
      type: 'btree',
      unique: false,
      reason: 'Filter users by role',
      priority: 'medium'
    });

    this.indexes.set('users_is_active', {
      table: 'users',
      columns: ['is_active'],
      type: 'btree',
      unique: false,
      reason: 'Filter active users',
      priority: 'medium'
    });

    this.indexes.set('requests_status', {
      table: 'requests',
      columns: ['status'],
      type: 'btree',
      unique: false,
      reason: 'Filter requests by status',
      priority: 'high'
    });

    this.indexes.set('requests_category', {
      table: 'requests',
      columns: ['category'],
      type: 'btree',
      unique: false,
      reason: 'Filter requests by category',
      priority: 'high'
    });

    this.indexes.set('requests_requester_id', {
      table: 'requests',
      columns: ['requester_id'],
      type: 'btree',
      unique: false,
      reason: 'Get requests by requester',
      priority: 'high'
    });

    this.indexes.set('requests_assigned_artist_id', {
      table: 'requests',
      columns: ['assigned_artist_id'],
      type: 'btree',
      unique: false,
      reason: 'Get requests by assigned artist',
      priority: 'high'
    });

    this.indexes.set('requests_created_at', {
      table: 'requests',
      columns: ['created_at'],
      type: 'btree',
      unique: false,
      reason: 'Order requests by creation time',
      priority: 'high'
    });

    this.indexes.set('chats_participants', {
      table: 'chats',
      columns: ['participants'],
      type: 'gin',
      unique: false,
      reason: 'Fast participant lookups',
      priority: 'high'
    });

    this.indexes.set('chats_is_active', {
      table: 'chats',
      columns: ['is_active'],
      type: 'btree',
      unique: false,
      reason: 'Filter active chats',
      priority: 'medium'
    });

    this.indexes.set('chats_last_message_at', {
      table: 'chats',
      columns: ['last_message_at'],
      type: 'btree',
      unique: false,
      reason: 'Order chats by last message time',
      priority: 'high'
    });

    this.indexes.set('messages_chat_id', {
      table: 'messages',
      columns: ['chat_id'],
      type: 'btree',
      unique: false,
      reason: 'Get messages by chat',
      priority: 'high'
    });

    this.indexes.set('messages_sender_id', {
      table: 'messages',
      columns: ['sender_id'],
      type: 'btree',
      unique: false,
      reason: 'Get messages by sender',
      priority: 'medium'
    });

    this.indexes.set('messages_created_at', {
      table: 'messages',
      columns: ['created_at'],
      type: 'btree',
      unique: false,
      reason: 'Order messages by time',
      priority: 'high'
    });

    this.indexes.set('messages_is_read', {
      table: 'messages',
      columns: ['is_read'],
      type: 'btree',
      unique: false,
      reason: 'Filter read/unread messages',
      priority: 'medium'
    });

    this.indexes.set('activities_user_id', {
      table: 'activities',
      columns: ['user_id'],
      type: 'btree',
      unique: false,
      reason: 'Get activities by user',
      priority: 'high'
    });

    this.indexes.set('activities_entity_type', {
      table: 'activities',
      columns: ['entity_type'],
      type: 'btree',
      unique: false,
      reason: 'Filter activities by type',
      priority: 'medium'
    });

    this.indexes.set('activities_created_at', {
      table: 'activities',
      columns: ['created_at'],
      type: 'btree',
      unique: false,
      reason: 'Order activities by time',
      priority: 'high'
    });

    this.indexes.set('notifications_user_id', {
      table: 'notifications',
      columns: ['user_id'],
      type: 'btree',
      unique: false,
      reason: 'Get notifications by user',
      priority: 'high'
    });

    this.indexes.set('notifications_is_read', {
      table: 'notifications',
      columns: ['is_read'],
      type: 'btree',
      unique: false,
      reason: 'Filter read/unread notifications',
      priority: 'high'
    });

    this.indexes.set('notifications_created_at', {
      table: 'notifications',
      columns: ['created_at'],
      type: 'btree',
      unique: false,
      reason: 'Order notifications by time',
      priority: 'high'
    });
  }

  // Get all indexes
  getAllIndexes() {
    return Array.from(this.indexes.entries()).map(([name, index]) => ({
      name,
      ...index
    }));
  }

  // Get indexes by table
  getIndexesByTable(table) {
    return this.getAllIndexes().filter(index => index.table === table);
  }

  // Get indexes by priority
  getIndexesByPriority(priority) {
    return this.getAllIndexes().filter(index => index.priority === priority);
  }

  // Add custom index
  addIndex(name, table, columns, options = {}) {
    this.indexes.set(name, {
      table,
      columns: Array.isArray(columns) ? columns : [columns],
      type: options.type || 'btree',
      unique: options.unique || false,
      reason: options.reason || 'Custom index',
      priority: options.priority || 'medium'
    });
  }

  // Remove index
  removeIndex(name) {
    return this.indexes.delete(name);
  }

  // Generate CREATE INDEX SQL
  generateCreateIndexSQL(indexName, index) {
    const uniqueKeyword = index.unique ? 'UNIQUE ' : '';
    const columns = index.columns.join(', ');
    
    return `CREATE ${uniqueKeyword}INDEX ${indexName} ON ${index.table} USING ${index.type} (${columns});`;
  }

  // Generate DROP INDEX SQL
  generateDropIndexSQL(indexName) {
    return `DROP INDEX IF EXISTS ${indexName};`;
  }

  // Generate all index creation SQL
  generateAllIndexSQL() {
    const sql = [];
    
    for (const [name, index] of this.indexes) {
      sql.push(this.generateCreateIndexSQL(name, index));
    }
    
    return sql.join('\n');
  }

  // Check if index exists in database
  async checkIndexExists(indexName) {
    try {
      const { data, error } = await supabase
        .rpc('check_index_exists', { index_name: indexName });
      
      if (error) throw error;
      return data;
    } catch (error) {
      // Fallback: try to query pg_indexes
      try {
        const { data, error } = await supabase
          .from('pg_indexes')
          .select('indexname')
          .eq('indexname', indexName)
          .single();
        
        return !error && data;
      } catch (fallbackError) {
        console.error('Error checking index existence:', fallbackError);
        return false;
      }
    }
  }

  // Create index in database
  async createIndex(indexName) {
    const index = this.indexes.get(indexName);
    if (!index) {
      throw new Error(`Index ${indexName} not found`);
    }

    try {
      const sql = this.generateCreateIndexSQL(indexName, index);
      const { error } = await supabase.rpc('exec_sql', { sql });
      
      if (error) throw error;
      
      return {
        success: true,
        message: `Index ${indexName} created successfully`,
        sql: sql
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        sql: this.generateCreateIndexSQL(indexName, index)
      };
    }
  }

  // Drop index from database
  async dropIndex(indexName) {
    try {
      const sql = this.generateDropIndexSQL(indexName);
      const { error } = await supabase.rpc('exec_sql', { sql });
      
      if (error) throw error;
      
      return {
        success: true,
        message: `Index ${indexName} dropped successfully`,
        sql: sql
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        sql: this.generateDropIndexSQL(indexName)
      };
    }
  }

  // Create all indexes
  async createAllIndexes() {
    const results = [];
    
    for (const [name, index] of this.indexes) {
      const result = await this.createIndex(name);
      results.push({
        name,
        ...result
      });
    }
    
    return results;
  }

  // Analyze table for missing indexes
  async analyzeTable(tableName) {
    try {
      // This would typically involve analyzing query patterns
      // For now, we'll return the predefined indexes for the table
      const tableIndexes = this.getIndexesByTable(tableName);
      
      return {
        table: tableName,
        recommendedIndexes: tableIndexes,
        analysis: `Found ${tableIndexes.length} recommended indexes for table ${tableName}`
      };
    } catch (error) {
      return {
        table: tableName,
        error: error.message
      };
    }
  }

  // Get index usage statistics (requires pg_stat_user_indexes)
  async getIndexUsageStats() {
    try {
      const { data, error } = await supabase
        .from('pg_stat_user_indexes')
        .select('*');
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting index usage stats:', error);
      return [];
    }
  }

  // Optimize indexes based on usage
  async optimizeIndexes() {
    const usageStats = await this.getIndexUsageStats();
    const recommendations = [];
    
    // Find unused indexes
    const unusedIndexes = usageStats.filter(stat => 
      stat.idx_scan === 0 && 
      stat.idx_tup_read === 0 && 
      stat.idx_tup_fetch === 0
    );
    
    for (const unused of unusedIndexes) {
      recommendations.push({
        type: 'remove',
        index: unused.indexrelname,
        reason: 'Index is not being used',
        priority: 'low'
      });
    }
    
    // Find frequently used indexes
    const frequentIndexes = usageStats.filter(stat => 
      stat.idx_scan > 1000
    );
    
    for (const frequent of frequentIndexes) {
      recommendations.push({
        type: 'keep',
        index: frequent.indexrelname,
        reason: `Index is heavily used (${frequent.idx_scan} scans)`,
        priority: 'high'
      });
    }
    
    return recommendations;
  }

  // Get index maintenance report
  async getMaintenanceReport() {
    const allIndexes = this.getAllIndexes();
    const usageStats = await this.getIndexUsageStats();
    const optimization = await this.optimizeIndexes();
    
    return {
      totalIndexes: allIndexes.length,
      indexesByTable: this.groupIndexesByTable(allIndexes),
      indexesByPriority: this.groupIndexesByPriority(allIndexes),
      usageStats: usageStats,
      optimization: optimization,
      generatedAt: new Date().toISOString()
    };
  }

  // Group indexes by table
  groupIndexesByTable(indexes) {
    const grouped = {};
    for (const index of indexes) {
      if (!grouped[index.table]) {
        grouped[index.table] = [];
      }
      grouped[index.table].push(index);
    }
    return grouped;
  }

  // Group indexes by priority
  groupIndexesByPriority(indexes) {
    const grouped = {};
    for (const index of indexes) {
      if (!grouped[index.priority]) {
        grouped[index.priority] = [];
      }
      grouped[index.priority].push(index);
    }
    return grouped;
  }
}

module.exports = IndexManager;
