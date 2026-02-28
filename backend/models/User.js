const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please add a username'],
    unique: true,
    trim: true,
    maxlength: [50, 'Username can not be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    minlength: 6,
    select: false // Don't return password by default
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows null values while maintaining uniqueness
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  name: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['user', 'artist', 'admin'],
    default: 'user'
  },
  mode: {
    type: String,
    enum: ['user', 'artist'],
    default: 'user'
  },
  artist_mode_enabled: {
    type: Boolean,
    default: false
  },
  experience: {
    type: Number,
    default: 0
  },
  profilePicUrl: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio can not be more than 500 characters'],
    default: ''
  },
  categories: {
    type: [String],
    default: []
  },
  keywords: {
    type: [String],
    default: []
  },
  links: {
    instagram: { type: String, default: '' },
    website: { type: String, default: '' }
  },
  creationsGallery: [{
    title: String,
    imageUrl: String,
    createdAt: { type: Date, default: Date.now }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    email_notifications: { type: Boolean, default: true },
    theme: { type: String, default: 'light' }
  },
  artistSessionStart: {
    type: Date
  },
  lastLoginAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password using bcrypt
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Conver to JSON public format
userSchema.methods.toPublicJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

module.exports = mongoose.model('User', userSchema);