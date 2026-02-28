const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    reviewer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reviewer_username: {
        type: String,
        required: true
    },
    reviewee_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reviewee_username: {
        type: String,
        required: true
    },
    reviewer_role: {
        type: String,
        enum: ['customer', 'artist'],
        required: true
    },
    subject: {
        type: String,
        required: true,
        maxlength: 200
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    description: {
        type: String,
        required: true,
        maxlength: 2000
    },
    image_urls: {
        type: [String],
        default: []
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Review', reviewSchema);
