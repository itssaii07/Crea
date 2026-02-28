const express = require('express');
const auth = require('../middleware/auth');
const {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
} = require('../notifications');

const router = express.Router();

// List recent notifications for current user
router.get('/', auth, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const notifications = await getNotifications(req.user.id, parseInt(limit), parseInt(offset));
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'list_failed' });
  }
});

// Mark notification as read
router.post('/:id/read', auth, async (req, res) => {
  try {
    const notification = await markNotificationAsRead(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: 'not_found' });
    }
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'update_failed' });
  }
});

// Mark all notifications as read
router.post('/mark-all-read', auth, async (req, res) => {
  try {
    const result = await markAllNotificationsAsRead(req.user.id);
    if (result.success) {
      res.json({ message: 'all_notifications_marked_read', count: result.count });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'update_failed' });
  }
});

// Get unread notification count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await getUnreadNotificationCount(req.user.id);
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

module.exports = router;