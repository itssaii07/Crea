const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  category: {
    type: String,
    required: true
    // Categories are validated on frontend from predefined list
  },
  keywords: {
    type: [String],
    default: []
  },
  location: {
    type: String,
    default: 'Remote'
  },
  price: {
    type: Number,
    required: [true, 'Please add a budget/price']
  },
  imageUrl: {
    type: String, // Reference image
    default: ''
  },
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  specificArtistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedArtistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  visibility: {
    type: String,
    enum: ['general', 'direct'],
    default: 'general'
  },
  status: {
    type: String,
    enum: ['active', 'assigned', 'completed', 'cancelled'],
    default: 'active'
  },
  requester_marked_done: {
    type: Boolean,
    default: false
  },
  artist_marked_done: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Configure toJSON to include virtuals
requestSchema.set('toJSON', { virtuals: true });
requestSchema.set('toObject', { virtuals: true });

// Methods for compatibility with old codebase
requestSchema.methods.toPublicJSON = function () {
  return this.toJSON();
};

requestSchema.methods.accept = async function (artistId) {
  this.assignedArtistId = artistId;
  this.status = 'assigned';
  this.visibility = 'direct'; // Once assigned, it's effectively direct
  return this.save();
};

requestSchema.methods.reject = async function () {
  this.assignedArtistId = null;
  this.status = 'active'; // Return to pool if general, or just unassigned
  if (this.specificArtistId) {
    // If it was a direct request, it stays direct but unassigned (or user might need to act)
    // For now, let's keep it simple
  }
  return this.save();
};

requestSchema.methods.complete = async function () {
  this.status = 'completed';
  return this.save();
};

// Static methods for querying
requestSchema.statics.getGeneralRequests = async function (userId, filters = {}, limit = 20) {
  const query = {
    visibility: 'general',
    status: 'active',
    assignedArtistId: null,
    specificArtistId: { $in: [null, undefined] } // Exclude requests sent to specific artists
  };

  if (filters.category) query.category = filters.category;
  if (filters.location) query.location = filters.location;

  console.log('General requests query:', JSON.stringify(query));
  const results = await this.find(query).limit(limit).sort({ createdAt: -1 });
  console.log('General requests found:', results.length);
  results.forEach(r => console.log('  -', r.title, 'visibility:', r.visibility, 'specificArtistId:', r.specificArtistId));
  return results;
};

requestSchema.statics.getUserRequests = async function (userId, limit = 20) {
  // Show ALL requests created by the user (both general and direct)
  return this.find({ requesterId: userId }).limit(limit).sort({ createdAt: -1 });
};

requestSchema.statics.getAssignedRequests = async function (artistId, limit = 20) {
  // For "For Me" section: requests where the artist is the target (specificArtistId)
  // but NOT the requester (don't show own requests)
  return this.find({
    specificArtistId: artistId,
    requesterId: { $ne: artistId }, // Exclude own requests
    status: { $in: ['active', 'assigned'] }
  }).limit(limit).sort({ createdAt: -1 });
};

requestSchema.statics.getAcceptedRequests = async function (artistId, limit = 20) {
  return this.find({
    assignedArtistId: artistId,
    status: 'assigned'
  }).limit(limit).sort({ createdAt: -1 });
};

requestSchema.statics.getById = async function (id) {
  return this.findById(id).populate('requesterId', 'name username profilePicUrl').populate('assignedArtistId', 'name username profilePicUrl');
};

module.exports = mongoose.model('Request', requestSchema);
