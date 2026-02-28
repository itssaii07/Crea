const express = require('express');
const auth = require('../middleware/auth');
const { trackActivity, getUserActivities, getActivityStats } = require('../middleware/activityTracker');

const router = express.Router();

// Get recent activity
router.get('/recent', auth, async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    const activities = await getUserActivities(req.user.id, parseInt(limit), parseInt(offset));

    // Format activities for frontend (if needed)
    // Activity tracker now returns Mongoose docs which match the structure
    res.json(activities);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

// Alias: Get activity history (same as recent, for frontend compatibility)
router.get('/history', auth, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const activities = await getUserActivities(req.user.id, parseInt(limit), parseInt(offset));
    res.json({ activities });
  } catch (error) {
    console.error('Error fetching activity history:', error);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

// Get activity stats
router.get('/stats', auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const stats = await getActivityStats(req.user.id, parseInt(days));
    res.json(stats);
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

module.exports = router;
