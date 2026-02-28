const express = require('express');
const auth = require('../middleware/auth');
const multer = require('multer');
const reviewController = require('../controllers/reviewController');

const router = express.Router();

// Multer config for image uploads (memory storage)
const upload = multer({ storage: multer.memoryStorage() });

// Get all reviews
router.get('/', reviewController.getAllReviews);

// Create a new review
router.post('/', auth, reviewController.createReview);

// Upload image for review
router.post('/upload-image', auth, upload.single('image'), reviewController.uploadReviewImage);

// Delete a review
router.delete('/:id', auth, reviewController.deleteReview);

module.exports = router;
