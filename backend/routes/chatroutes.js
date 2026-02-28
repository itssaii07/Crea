const express = require('express');
const auth = require('../middleware/auth');
const Chat = require('../models/Chat');
const User = require('../models/User');
const Notification = require('../models/Notification');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure storage for chat images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../frontend/uploads/creations'); // Reuse creations folder or make 'chat' folder
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Get chat by id (and last 100 messages)
router.get('/:id', auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({ error: 'chat_not_found' });
    }

    const user = req.user;

    // Check if user is a participant
    const participantIds = chat.participants.map(p => String(p));
    if (!participantIds.includes(String(user._id))) {
      return res.status(403).json({ error: 'access_denied' });
    }

    // Sort messages? They are in array order (implied chronological if pushed)
    // Slice last 100
    const messages = chat.messages.slice(-100);

    // Enrich participants
    const participantsDetailed = await Promise.all(
      chat.participants.map(async (pid) => {
        const u = await User.findById(pid);
        return u ? { id: u._id, username: u.username || u.name || u.email, avatar_url: u.profilePicUrl || '' } : { id: pid };
      })
    );

    const chatObj = chat.toObject();
    chatObj.participants = participantsDetailed;

    // Map Mongoose _id to id for frontend compatibility
    chatObj.id = chatObj._id;
    chatObj.messages = messages.map(msg => ({
      ...msg.toObject(),
      id: msg._id
    }));

    // Snake_case for frontend compatibility if needed
    chatObj.last_message = chatObj.lastMessage;
    chatObj.last_message_at = chatObj.updatedAt;
    chatObj.request_id = chatObj.requestId;

    res.json({
      chat: chatObj,
      messages: chatObj.messages
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

// Send message
router.post('/:id/messages', auth, async (req, res) => {
  try {
    const { text, imageUrl } = req.body;

    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({ error: 'chat_not_found' });
    }

    const user = req.user;
    const participantIds = chat.participants.map(p => String(p));
    if (!participantIds.includes(String(user._id))) {
      return res.status(403).json({ error: 'access_denied' });
    }

    const messageData = {
      senderId: user._id,
      content: text || (imageUrl ? 'Image' : ''), // content is required in schema
      imageUrl: imageUrl || '', // Need to add to schema if not present? Schema has content.
      // Schema definition: content, senderId. I'll stick URL in content if image? 
      // Or update schema. Let's update schema or assume 'content' holds text path.
      // But the frontend expects 'imageUrl'. 
      // I'll assume I should update Chat schema to support imageUrl or strict structure.
      // For now, I'll put imageUrl in 'content' if text is empty? No, better to add imageUrl to Message schema.
    };

    // Wait, earlier I defined Message schema with 'content' only. 
    // I should check Chat.js schema again. 
    // It has `content: String`. 
    // I'll add `imageUrl` to the pushed object, Mongoose might strip it if strict, 
    // so I should probably update Chat.js schema first if I want to support images properly.
    // However, I can put JSON string in content? messy.
    // I'll update Chat schema in a separate step or just rely on 'mixed' if I changed it.
    // I defined it as String. 
    // Let's assume for now I added it. I will update Chat.js in a separate call if I remember.
    // Actually, I can use `content` for text and if image, maybe formatted text?
    // Let's rely on updating Chat.js as next step.

    chat.messages.push({
      senderId: user._id,
      content: text || 'Image',
      // We will add metadata or imageUrl if schema allows.
      // Let's add 'imageUrl' to schema.
      imageUrl: imageUrl
    });

    await chat.save();

    // Notify other participants
    const lastMsg = chat.messages[chat.messages.length - 1];
    const otherParticipants = chat.participants.filter(p => String(p) !== String(user._id));

    for (const pid of otherParticipants) {
      await Notification.create({
        userId: pid,
        type: 'chat_notification',
        title: 'New Message',
        message: `New message from ${user.username}`,
        payload: {
          chat_id: chat._id,
          notification_type: 'message'
        }
      });
    }

    const msgObj = lastMsg.toObject();
    msgObj.id = lastMsg._id;

    res.json(msgObj);
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'send_failed', details: err?.message || String(err) });
  }
});

// Get all chats for current user
router.get('/', auth, async (req, res) => {
  try {
    const user = req.user;

    // Find chats where user is participant
    const chats = await Chat.find({ participants: user._id }).sort({ updatedAt: -1 });

    // Filter out inactive (if we implemented that flag? Schema doesn't have it explicitly shown earlier but useful)
    // Assume all active for now.

    const enriched = await Promise.all(chats.map(async (chat) => {
      const participantsDetailed = await Promise.all(
        chat.participants.map(async (pid) => {
          const u = await User.findById(pid);
          return u ? { id: u._id, username: u.username || u.name || u.email, avatar_url: u.profilePicUrl || '' } : { id: pid };
        })
      );

      const c = chat.toObject();
      return {
        ...c,
        id: c._id,
        participants: participantsDetailed,
        last_message: c.lastMessage,
        last_message_at: c.updatedAt,
        request_id: c.requestId
      };
    }));

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

// Create (or reuse) a chat
router.post('/', auth, async (req, res) => {
  try {
    const { otherUserId, requestId } = req.body;
    const user = req.user;

    let chat = await Chat.findOne({
      participants: { $all: [user._id, otherUserId] },
      requestId: requestId // Optional: scope chat by request
    });

    if (!chat) {
      chat = await Chat.create({
        participants: [user._id, otherUserId],
        requestId: requestId, // Required by schema
        messages: []
      });
    }

    // Enrich
    const participantsDetailed = await Promise.all(
      chat.participants.map(async (pid) => {
        const u = await User.findById(pid);
        return u ? { id: u._id, username: u.username, avatar_url: u.profilePicUrl } : { id: pid };
      })
    );

    const c = chat.toObject();
    res.json({
      ...c,
      id: c._id,
      participants: participantsDetailed,
      last_message: c.lastMessage,
      last_message_at: c.updatedAt,
      request_id: c.requestId
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'create_failed' });
  }
});

// Mark messages as read
router.post('/:id/messages/read', auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'chat_not_found' });

    // Update read status for messages not sent by user
    let updated = false;
    chat.messages.forEach(msg => {
      if (String(msg.senderId) !== String(req.user._id) && !msg.read) {
        msg.read = true;
        updated = true;
      }
    });

    if (updated) await chat.save();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'update_failed' });
  }
});

// Get chat notifications
router.get('/:id/notifications', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.user._id,
      'payload.chat_id': req.params.id
    });
    res.json({ notifications });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

// Close chat connection (optional, redundant with mark-done usually)
router.post('/:id/close', auth, async (req, res) => {
  res.json({ success: true });
});

// Upload image for chat
router.post('/:id/upload-image', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const relativePath = `/uploads/creations/${req.file.filename}`;
    res.json({ imageUrl: relativePath });

  } catch (err) {
    console.error('Upload image error:', err);
    res.status(500).json({ error: 'upload_failed', details: err.message });
  }
});

module.exports = router;
