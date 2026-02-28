const express = require('express');
const auth = require('../middleware/auth');
const DatabaseBackup = require('../scripts/backup');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const backup = new DatabaseBackup();

// Admin middleware (you might want to add role-based auth)
const adminAuth = (req, res, next) => {
  // Check if user is admin (implement based on your auth system)
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Create full backup
router.post('/full', auth, adminAuth, async (req, res) => {
  try {
    const result = await backup.createFullBackup();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Full backup created successfully',
        file: result.file,
        size: backup.formatBytes(result.size),
        records: result.records
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Backup creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create backup'
    });
  }
});

// Create incremental backup
router.post('/incremental', auth, adminAuth, async (req, res) => {
  try {
    const lastBackupTime = backup.getLastBackupTime();
    const result = await backup.createIncrementalBackup(lastBackupTime);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Incremental backup created successfully',
        file: result.file,
        size: backup.formatBytes(result.size),
        records: result.records,
        lastBackupTime: lastBackupTime
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Incremental backup creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create incremental backup'
    });
  }
});

// List available backups
router.get('/list', auth, adminAuth, async (req, res) => {
  try {
    const backups = backup.listBackups();
    
    res.json({
      success: true,
      backups: backups.map(backup => ({
        name: backup.name,
        type: backup.type,
        size: backup.size,
        sizeFormatted: backup.formatBytes(backup.size),
        created: backup.created,
        path: backup.path
      }))
    });
  } catch (error) {
    console.error('List backups error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list backups'
    });
  }
});

// Get backup statistics
router.get('/stats', auth, adminAuth, async (req, res) => {
  try {
    const stats = backup.getBackupStats();
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('Backup stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get backup statistics'
    });
  }
});

// Download backup file
router.get('/download/:filename', auth, adminAuth, async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(backup.backupDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Backup file not found'
      });
    }

    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({
          success: false,
          error: 'Failed to download backup file'
        });
      }
    });
  } catch (error) {
    console.error('Download backup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download backup'
    });
  }
});

// Restore from backup
router.post('/restore', auth, adminAuth, async (req, res) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'Backup filename is required'
      });
    }

    const filePath = path.join(backup.backupDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Backup file not found'
      });
    }

    // Warning: This will overwrite existing data
    const result = await backup.restoreFromBackup(filePath);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Database restored successfully from backup'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore from backup'
    });
  }
});

// Delete backup file
router.delete('/:filename', auth, adminAuth, async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(backup.backupDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Backup file not found'
      });
    }

    fs.unlinkSync(filePath);
    
    res.json({
      success: true,
      message: 'Backup file deleted successfully'
    });
  } catch (error) {
    console.error('Delete backup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete backup file'
    });
  }
});

// Cleanup old backups
router.post('/cleanup', auth, adminAuth, async (req, res) => {
  try {
    const { daysToKeep = 30 } = req.body;
    const result = backup.cleanupOldBackups(daysToKeep);
    
    res.json({
      success: true,
      message: `Cleanup completed: deleted ${result.deletedCount} files, freed ${backup.formatBytes(result.totalSize)}`,
      deletedCount: result.deletedCount,
      totalSize: result.totalSize
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup old backups'
    });
  }
});

// Start scheduled backups
router.post('/schedule/start', auth, adminAuth, async (req, res) => {
  try {
    backup.scheduleBackups();
    
    res.json({
      success: true,
      message: 'Backup scheduling started'
    });
  } catch (error) {
    console.error('Schedule start error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start backup scheduling'
    });
  }
});

// Get backup configuration
router.get('/config', auth, adminAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      config: {
        backupDir: backup.backupDir,
        maxFileSize: backup.maxFileSize,
        allowedImageTypes: backup.allowedImageTypes,
        allowedFileTypes: backup.allowedFileTypes
      }
    });
  } catch (error) {
    console.error('Config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get backup configuration'
    });
  }
});

module.exports = router;
