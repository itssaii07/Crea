const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Request = require('../models/Request');

const router = express.Router();

// Explore artists
router.get('/artists', auth, async (req, res) => {
    try {
        const query = {};

        // Exclude current user
        if (req.user) {
            query._id = { $ne: req.user._id };
        }

        if (req.query.category) {
            query.categories = req.query.category;
        }

        if (req.query.keyword) {
            query.keywords = req.query.keyword;
        }

        if (req.query.q) {
            query.username = { $regex: req.query.q, $options: 'i' };
        }

        const artists = await User.find(query);

        // Calculate stats
        const artistsWithStats = await Promise.all(artists.map(async (artist) => {
            const ordersCount = await Request.countDocuments({ requesterId: artist._id });
            const creationsCount = artist.creationsGallery ? artist.creationsGallery.length : 0;

            const publicData = artist.toPublicJSON();
            return {
                ...publicData,
                id: artist._id.toString(), // Frontend expects 'id' not '_id'
                profile_pic_url: artist.profilePicUrl || '', // Frontend expects snake_case
                stats: {
                    orders: ordersCount,
                    creations: creationsCount,
                    experience: artist.experience
                }
            };
        }));

        res.json(artistsWithStats);
    } catch (error) {
        console.error('Error fetching artists:', error);
        res.status(500).json({ error: 'fetch_failed' });
    }
});

// Get all categories (Static list of available categories)
router.get('/categories', async (req, res) => {
    try {
        // Predefined list of all available categories
        const allCategories = [
            'air dry clay toy making', 'basket weaving', 'beadwork', 'calligraphy',
            'candle making', 'clothes', 'collage art', 'crochet', 'decoupage',
            'digital art', 'drawing', 'embroidery', 'fabric painting',
            'flower pressing & leaf art', 'folk art', 'furniture', 'glass art',
            'glass etching', 'graffiti (traditional)', 'henna / mehndi art',
            'jewellery', 'knitting', 'leather craft', 'macrame', 'metalworking',
            'miniature arts', 'mixed media art', 'mosaic art', 'nature crafts',
            'origami', 'painting', 'papier-mâché', 'paper marbling', 'phone cases',
            'portraits', 'pottery', 'pyrography', 'quilling', 'quilting',
            'resin art', 'rugs', 'scrapbooking', 'scrimshaw', 'sculpting',
            'shell art', 'soap making', 'stained glass art', 'string art',
            't-shirt art', 'upcycled art', 'wall hangings', 'wood carving', 'others'
        ];

        const validCategories = allCategories.map(c => ({ name: c }));
        res.json(validCategories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'fetch_failed' });
    }
});

module.exports = router;