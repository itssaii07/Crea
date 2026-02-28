const express = require("express");
const auth = require("../middleware/auth");
const { trackActivity } = require('../middleware/activityTracker');
const User = require("../models/User");
const Request = require("../models/Request");
const Chat = require("../models/Chat");
const Activity = require("../models/Activity");
const Notification = require("../models/Notification");

const router = express.Router();

// Get user settings
router.get("/settings", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const settings = user.settings || {};
    settings.name = user.name;
    res.json(settings);
  } catch (error) {
    console.error('Error getting user settings:', error);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

// Update user settings
router.post("/settings", auth, async (req, res) => {
  try {
    const { email_notifications, theme } = req.body;
    const user = await User.findById(req.user.id);

    if (email_notifications !== undefined) user.settings.email_notifications = email_notifications;
    if (theme !== undefined) user.settings.theme = theme;

    await user.save();
    res.json(user.settings);
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ error: 'update_failed' });
  }
});

// Get current user profile
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'user_not_found' });
    }

    // Calculate stats
    const ordersCount = await Request.countDocuments({ requesterId: user._id });
    const creationsCount = user.creationsGallery ? user.creationsGallery.length : 0;

    const stats = {
      orders: ordersCount,
      creations: creationsCount,
      experience: user.experience
    };

    res.json({
      user: user.toPublicJSON(),
      username: user.username,
      bio: user.bio,
      categories: user.categories,
      keywords: user.keywords,
      links: user.links,
      profilePicUrl: user.profilePicUrl,
      creationsGallery: user.creationsGallery,
      stats: stats
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

// Create or update user profile
router.post("/profile", auth, trackActivity('profile_updated', 'profile'), async (req, res) => {
  try {
    const { username, bio, categories, keywords, links, profilePicUrl, creationsGallery } = req.body;

    // Check username uniqueness if changed
    if (username) {
      const existingUser = await User.findOne({ username });
      if (existingUser && String(existingUser._id) !== String(req.user.id)) {
        return res.status(400).json({ error: 'username_taken' });
      }
    }

    const updateData = {};
    if (username) updateData.username = username;
    if (bio !== undefined) updateData.bio = bio;
    if (categories) updateData.categories = categories;
    if (keywords) updateData.keywords = keywords;
    if (links) updateData.links = links;
    if (profilePicUrl) updateData.profilePicUrl = profilePicUrl;
    if (creationsGallery) updateData.creationsGallery = creationsGallery;

    const user = await User.findByIdAndUpdate(req.user.id, updateData, { new: true });

    res.json({
      user: user.toPublicJSON(),
      ...updateData
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'update_failed' });
  }
});

// Get user by ID
router.get("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format to prevent CastError
    if (!id || id === 'undefined' || id === 'null' || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ error: 'invalid_user_id' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'user_not_found' });
    }

    const ordersCount = await Request.countDocuments({ requesterId: user._id });
    const creationsCount = user.creationsGallery ? user.creationsGallery.length : 0;

    const publicProfile = user.toPublicJSON();
    publicProfile.stats = {
      orders: ordersCount,
      creations: creationsCount,
      experience: user.experience
    };
    publicProfile.artist_mode_enabled = user.artist_mode_enabled;
    publicProfile.experience = user.experience;

    res.json(publicProfile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

// Get user by username
router.get("/username/:username", auth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ error: 'user_not_found' });
    }

    res.json(user.toPublicJSON());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

// Update user mode (user/artist)
router.patch("/mode", auth, trackActivity('mode_changed', 'user'), async (req, res) => {
  try {
    const { mode } = req.body;
    if (!['user', 'artist'].includes(mode)) {
      return res.status(400).json({ error: 'invalid_mode' });
    }

    const user = await User.findByIdAndUpdate(req.user.id, { mode }, { new: true });

    res.json({ mode: user.mode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'update_failed' });
  }
});

// Get user statistics
router.get("/stats/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'user_not_found' });
    }

    const ordersCount = await Request.countDocuments({ requesterId: user._id });
    const creationsCount = user.creationsGallery ? user.creationsGallery.length : 0;

    const stats = {
      orders: ordersCount,
      creations: creationsCount,
      experience: user.experience
    };

    res.json({
      user: stats,
      profile: stats
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

// Search users
router.get("/search", auth, async (req, res) => {
  try {
    const { q: searchTerm, limit = 10 } = req.query;

    if (!searchTerm) {
      return res.json([]);
    }

    // Simple regex search (could be improved with text indexes)
    const users = await User.find({
      name: { $regex: searchTerm, $options: 'i' }
    }).limit(parseInt(limit));

    res.json(users.map(user => user.toPublicJSON()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'search_failed' });
  }
});

// Delete user account
router.delete("/account", auth, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'password_required' });
    }

    const user = await User.findById(req.user.id).select('+password');

    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: 'invalid_password' });
    }

    // Delete user data
    // Delete requests, chats, activities, notifications...
    await Request.deleteMany({ requesterId: user._id });
    await Request.deleteMany({ assignedArtistId: user._id });
    await Chat.deleteMany({ participants: user._id }); // Or pull user from participants
    await Activity.deleteMany({ userId: user._id });
    await Notification.deleteMany({ userId: user._id });

    await User.findByIdAndDelete(user._id);

    res.json({ success: true, message: 'Account deleted successfully' });

  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'deletion_failed' });
  }
});

// Toggle artist mode
router.patch("/artist-mode", auth, trackActivity('artist_mode_toggled', 'user'), async (req, res) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'invalid_payload' });
    }

    const user = await User.findById(req.user.id);

    if (enabled) {
      user.artist_mode_enabled = true;
      user.artistSessionStart = new Date();
    } else {
      user.artist_mode_enabled = false;
      if (user.artistSessionStart) {
        const duration = Math.round((Date.now() - user.artistSessionStart) / 1000);
        user.experience += duration;
        user.artistSessionStart = null;
      }
    }

    await user.save();

    res.json({ artist_mode_enabled: user.artist_mode_enabled, experience: user.experience });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'update_failed' });
  }
});

module.exports = router;
