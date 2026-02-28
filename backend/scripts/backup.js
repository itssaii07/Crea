// Database Backup Script for Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

class DatabaseBackup {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role key for admin operations
    
    if (!this.supabaseUrl || !this.supabaseServiceKey) {
      console.warn('Supabase credentials not found. Backup functionality will be limited.');
      this.supabase = null;
    } else {
      this.supabase = createClient(this.supabaseUrl, this.supabaseServiceKey);
    }
    
    this.backupDir = path.join(__dirname, '../backups');
    this.ensureBackupDirectory();
  }

  // Ensure backup directory exists
  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  // Create a full database backup
  async createFullBackup() {
    try {
      if (!this.supabase) {
        throw new Error('Supabase not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
      }

      console.log('Starting full database backup...');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(this.backupDir, `full_backup_${timestamp}.json`);

      // Get all tables data
      const tables = ['users', 'requests', 'chats', 'messages', 'activities', 'notifications'];
      const backupData = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        tables: {}
      };

      for (const table of tables) {
        console.log(`Backing up table: ${table}`);
        const { data, error } = await this.supabase
          .from(table)
          .select('*');

        if (error) {
          console.error(`Error backing up table ${table}:`, error);
          continue;
        }

        backupData.tables[table] = data;
        console.log(`Backed up ${data.length} records from ${table}`);
      }

      // Write backup to file
      fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
      console.log(`Full backup created: ${backupFile}`);

      // Clean up old backups (keep last 30 days)
      this.cleanupOldBackups();

      return {
        success: true,
        file: backupFile,
        size: fs.statSync(backupFile).size,
        records: Object.values(backupData.tables).reduce((sum, table) => sum + table.length, 0)
      };

    } catch (error) {
      console.error('Full backup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Create incremental backup (only changed records)
  async createIncrementalBackup(lastBackupTime) {
    try {
      if (!this.supabase) {
        throw new Error('Supabase not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
      }

      console.log('Starting incremental backup...');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(this.backupDir, `incremental_backup_${timestamp}.json`);

      const backupData = {
        timestamp: new Date().toISOString(),
        type: 'incremental',
        lastBackupTime: lastBackupTime,
        tables: {}
      };

      // Get tables with updated_at columns
      const tablesWithTimestamps = ['users', 'requests', 'chats', 'messages', 'activities', 'notifications'];
      
      for (const table of tablesWithTimestamps) {
        console.log(`Backing up changes in table: ${table}`);
        
        const { data, error } = await this.supabase
          .from(table)
          .select('*')
          .gte('updated_at', lastBackupTime);

        if (error) {
          console.error(`Error backing up table ${table}:`, error);
          continue;
        }

        if (data.length > 0) {
          backupData.tables[table] = data;
          console.log(`Backed up ${data.length} changed records from ${table}`);
        }
      }

      // Write backup to file
      fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
      console.log(`Incremental backup created: ${backupFile}`);

      return {
        success: true,
        file: backupFile,
        size: fs.statSync(backupFile).size,
        records: Object.values(backupData.tables).reduce((sum, table) => sum + table.length, 0)
      };

    } catch (error) {
      console.error('Incremental backup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Restore from backup
  async restoreFromBackup(backupFile) {
    try {
      console.log(`Restoring from backup: ${backupFile}`);
      
      if (!fs.existsSync(backupFile)) {
        throw new Error('Backup file not found');
      }

      const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
      
      // Restore each table
      for (const [tableName, records] of Object.entries(backupData.tables)) {
        if (!records || records.length === 0) continue;

        console.log(`Restoring ${records.length} records to table: ${tableName}`);

        // Clear existing data (be careful in production!)
        const { error: deleteError } = await this.supabase
          .from(tableName)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

        if (deleteError) {
          console.error(`Error clearing table ${tableName}:`, deleteError);
          continue;
        }

        // Insert backup data
        const { error: insertError } = await this.supabase
          .from(tableName)
          .insert(records);

        if (insertError) {
          console.error(`Error restoring table ${tableName}:`, insertError);
          continue;
        }

        console.log(`Successfully restored ${records.length} records to ${tableName}`);
      }

      console.log('Restore completed successfully');
      return { success: true };

    } catch (error) {
      console.error('Restore failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Clean up old backup files
  cleanupOldBackups(daysToKeep = 30) {
    try {
      const files = fs.readdirSync(this.backupDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      let deletedCount = 0;
      let totalSize = 0;

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          totalSize += stats.size;
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`Deleted old backup: ${file}`);
        }
      }

      console.log(`Cleanup completed: deleted ${deletedCount} files, freed ${this.formatBytes(totalSize)}`);
      return { deletedCount, totalSize };

    } catch (error) {
      console.error('Cleanup failed:', error);
      return { success: false, error: error.message };
    }
  }

  // List available backups
  listBackups() {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backups = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        
        backups.push({
          name: file,
          path: filePath,
          size: stats.size,
          created: stats.mtime,
          type: file.includes('incremental') ? 'incremental' : 'full'
        });
      }

      return backups.sort((a, b) => b.created - a.created);

    } catch (error) {
      console.error('List backups failed:', error);
      return [];
    }
  }

  // Get backup statistics
  getBackupStats() {
    const backups = this.listBackups();
    const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
    const fullBackups = backups.filter(b => b.type === 'full').length;
    const incrementalBackups = backups.filter(b => b.type === 'incremental').length;

    return {
      totalBackups: backups.length,
      fullBackups,
      incrementalBackups,
      totalSize: this.formatBytes(totalSize),
      oldestBackup: backups.length > 0 ? backups[backups.length - 1].created : null,
      newestBackup: backups.length > 0 ? backups[0].created : null
    };
  }

  // Schedule automatic backups
  scheduleBackups() {
    // Full backup every day at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('Running scheduled full backup...');
      await this.createFullBackup();
    });

    // Incremental backup every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      console.log('Running scheduled incremental backup...');
      const lastBackupTime = this.getLastBackupTime();
      await this.createIncrementalBackup(lastBackupTime);
    });

    // Cleanup old backups every day at 3 AM
    cron.schedule('0 3 * * *', () => {
      console.log('Running scheduled cleanup...');
      this.cleanupOldBackups();
    });

    console.log('Backup schedules configured');
  }

  // Get last backup time for incremental backups
  getLastBackupTime() {
    const backups = this.listBackups();
    if (backups.length === 0) {
      // If no backups exist, backup everything from the last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString();
    }
    
    return backups[0].created.toISOString();
  }

  // Format bytes to human readable format
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Export backup to external storage (implement based on your needs)
  async exportBackup(backupFile, destination) {
    // This would implement exporting to AWS S3, Google Cloud Storage, etc.
    console.log(`Exporting backup ${backupFile} to ${destination}`);
    // Implementation depends on your external storage choice
  }

  // Import backup from external storage
  async importBackup(source, destination) {
    // This would implement importing from external storage
    console.log(`Importing backup from ${source} to ${destination}`);
    // Implementation depends on your external storage choice
  }
}

// CLI interface
if (require.main === module) {
  const backup = new DatabaseBackup();
  const command = process.argv[2];

  switch (command) {
    case 'full':
      backup.createFullBackup().then(result => {
        console.log('Full backup result:', result);
        process.exit(result.success ? 0 : 1);
      });
      break;

    case 'incremental':
      const lastBackupTime = backup.getLastBackupTime();
      backup.createIncrementalBackup(lastBackupTime).then(result => {
        console.log('Incremental backup result:', result);
        process.exit(result.success ? 0 : 1);
      });
      break;

    case 'restore':
      const backupFile = process.argv[3];
      if (!backupFile) {
        console.error('Please provide backup file path');
        process.exit(1);
      }
      backup.restoreFromBackup(backupFile).then(result => {
        console.log('Restore result:', result);
        process.exit(result.success ? 0 : 1);
      });
      break;

    case 'list':
      const backups = backup.listBackups();
      console.log('Available backups:');
      backups.forEach(backup => {
        console.log(`- ${backup.name} (${backup.type}, ${backup.formatBytes(backup.size)}, ${backup.created})`);
      });
      break;

    case 'stats':
      const stats = backup.getBackupStats();
      console.log('Backup statistics:', stats);
      break;

    case 'schedule':
      backup.scheduleBackups();
      console.log('Backup scheduling started. Press Ctrl+C to stop.');
      // Keep the process running
      setInterval(() => {}, 1000);
      break;

    default:
      console.log(`
Usage: node backup.js <command> [options]

Commands:
  full                    Create a full database backup
  incremental            Create an incremental backup
  restore <file>         Restore from backup file
  list                   List available backups
  stats                  Show backup statistics
  schedule               Start scheduled backups

Examples:
  node backup.js full
  node backup.js incremental
  node backup.js restore ./backups/full_backup_2024-01-01T02-00-00-000Z.json
  node backup.js list
  node backup.js stats
  node backup.js schedule
      `);
      process.exit(1);
  }
}

module.exports = DatabaseBackup;
