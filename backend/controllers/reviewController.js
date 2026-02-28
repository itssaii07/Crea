const Review = require('../models/Review');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');

// Get all reviews
exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });

    // Enrich with usernames as the frontend expects simple objects with username fields
    // Ideally, we should populate this via mongoose populate if references exist
    // But for now, let's just return what we have or implement manual enrichment if needed.
    // Assuming Review model stores usernames directly or we populate.

    // For now, let's assume simple return is fine or Mongoose schema matches.
    res.status(200).json(reviews);
  } catch (error) {
    console.error('Error getting reviews:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create a new review
exports.createReview = async (req, res) => {
  try {
    const { reviewee_username, reviewer_role, subject, rating, description, image_urls } = req.body;
    const reviewer_id = req.user.id;

    const reviewer = await User.findById(reviewer_id);
    if (!reviewer) {
      return res.status(404).json({ message: 'Reviewer not found' });
    }

    // Get the reviewee's user object by username
    const trimmedUsername = reviewee_username.trim().toLowerCase();
    const reviewee = await User.findOne({ username: trimmedUsername });

    if (!reviewee) {
      return res.status(404).json({ message: 'User to review not found' });
    }

    const review = new Review({
      reviewer_id,
      reviewer_username: reviewer.username,
      reviewee_id: reviewee._id,
      reviewee_username: reviewee.username,
      reviewer_role,
      subject,
      rating: parseInt(rating, 10),
      description,
      image_urls,
    });

    await review.save();

    res.status(201).json(review);
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Upload an image for a review (Local Storage)
exports.uploadReviewImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Since we are using local storage via multer in the routes (assuming), 
    // we just need to return the path.
    // If multer is configured to save to disk, `req.file.path` or `req.file.filename` is available.
    // If memory storage, we need to write it.

    // Assuming the route middleware handles simple storage to 'uploads/' or similar.
    // Let's implement a simple write here if buffer is present (MemoryStorage).

    if (req.file.buffer) {
      const uploadDir = path.join(__dirname, '../../uploads/reviews');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filename = `${Date.now()}-${req.file.originalname.replace(/\s/g, '_')}`;
      const filePath = path.join(uploadDir, filename);

      fs.writeFileSync(filePath, req.file.buffer);

      // Return a relative path or public URL
      const publicUrl = `/uploads/reviews/${filename}`;
      return res.status(200).json({ imageUrl: publicUrl });
    } else if (req.file.path) {
      // DiskStorage was likely used
      // Normalize path for URL
      const publicUrl = `/uploads/${req.file.filename}`;
      return res.status(200).json({ imageUrl: publicUrl });
    }

    res.status(500).json({ message: 'File upload handling failed' });

  } catch (error) {
    console.error('Error uploading review image:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete a review
exports.deleteReview = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const userId = req.user.id; // user id from auth middleware

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if the user is the owner of the review
    // Ensure types match (ObjectId vs string)
    if (review.reviewer_id.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You are not authorized to delete this review' });
    }

    await Review.findByIdAndDelete(reviewId);

    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
