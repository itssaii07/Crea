const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request',
    required: true
  },
  messages: [messageSchema],
  lastMessage: {
    content: String,
    senderId: mongoose.Schema.Types.ObjectId,
    createdAt: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update lastMessage and updatedAt on new message
chatSchema.pre('save', function (next) {
  if (this.isModified('messages') && this.messages.length > 0) {
    const lastMsg = this.messages[this.messages.length - 1];
    this.lastMessage = {
      content: lastMsg.content,
      senderId: lastMsg.senderId,
      createdAt: lastMsg.createdAt
    };
    this.updatedAt = Date.now();
  }
  next();
});

module.exports = mongoose.model('Chat', chatSchema);