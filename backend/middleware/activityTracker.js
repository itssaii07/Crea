const Activity = require('../models/Activity');

function trackActivity(activity_type, entity_type) {
    return async (req, res, next) => {
        try {
            // Check if user is authenticated (req.user exists)
            if (req.user && req.user._id) {
                const metadata = {
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    url: req.originalUrl,
                    method: req.method,
                };

                if (req.params.id) {
                    metadata.entity_id = req.params.id;
                }

                if (req.body) {
                    metadata.body = req.body;
                }

                await Activity.create({
                    userId: req.user._id,
                    activityType: activity_type,
                    metadata: metadata
                });

                // For key request events, mirror a richer record so frontend can categorize (legacy support)
                try {
                    if (['request_created', 'request_completed'].includes(activity_type)) {
                        await Activity.create({
                            userId: req.user._id,
                            activityType: activity_type,
                            metadata: {
                                ...metadata,
                                request_id: req.params.id || req.body?.requestId,
                                title: req.body?.title,
                                imageUrl: req.body?.imageUrl,
                            }
                        });
                    }
                } catch (e) {
                    // non-blocking
                }
            }
        } catch (error) {
            console.error('Activity tracking error:', error);
        }
        next();
    };
}

async function getUserActivities(userId, limit = 50, offset = 0) {
    try {
        const activities = await Activity.find({ userId })
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit);
        return activities;
    } catch (error) {
        console.error('Error getting user activities:', error);
        return [];
    }
}

async function getActivityStats(userId, days = 30) {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const activities = await Activity.find({
            userId,
            createdAt: { $gte: startDate }
        });

        const stats = activities.reduce((acc, activity) => {
            acc[activity.activityType] = (acc[activity.activityType] || 0) + 1;
            return acc;
        }, {});

        return {
            totalActivities: activities.length,
            activitiesByType: stats,
            period: `${days} days`
        };
    } catch (error) {
        console.error('Error getting activity stats:', error);
        return { totalActivities: 0, activitiesByType: {}, period: `${days} days` };
    }
}

async function cleanupOldActivities(daysToKeep = 90) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const result = await Activity.deleteMany({
            createdAt: { $lt: cutoffDate }
        });

        return { success: true, message: `Cleaned up ${result.deletedCount} activities` };
    } catch (error) {
        console.error('Error cleaning up old activities:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    trackActivity,
    getUserActivities,
    getActivityStats,
    cleanupOldActivities,
};