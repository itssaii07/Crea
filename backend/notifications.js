const Notification = require('./models/Notification');

async function createNotification(userId, type, payload) {
  try {
    const notification = await Notification.create({
      userId,
      type,
      payload,
      // Attempt to extract reasonable defaults for title/message if not provided in payload (could be improved)
      title: payload.title || type,
      message: payload.message || ''
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

async function getNotifications(userId, limit = 20, offset = 0) {
  try {
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    return notifications;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

async function getUnreadNotificationCount(userId) {
  try {
    const count = await Notification.countDocuments({
      userId,
      isRead: false
    });

    return count;
  } catch (error) {
    console.error('Error fetching unread notification count:', error);
    return 0;
  }
}

async function markNotificationAsRead(notificationId) {
  try {
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true }
    );

    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return null;
  }
}

async function markAllNotificationsAsRead(userId) {
  try {
    const result = await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    return { success: true, count: result.modifiedCount };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, error: 'update_failed' };
  }
}

module.exports = {
  createNotification,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
