const express = require('express');
const User = require('../models/User');
const Request = require('../models/Request');

const router = express.Router();

// Root home endpoint - returns combined data
router.get('/', async (req, res) => {
    try {
        // Fetch popular artists
        let artists = await User.find({ artist_mode_enabled: true }).limit(4);
        if (artists.length < 4) {
            const others = await User.find({ _id: { $nin: artists.map(a => a._id) } }).limit(4 - artists.length);
            artists = artists.concat(others);
        }

        const artistsWithStats = await Promise.all(artists.map(async (artist) => {
            const ordersCount = await Request.countDocuments({ requesterId: artist._id });
            const creationsCount = artist.creationsGallery ? artist.creationsGallery.length : 0;
            return {
                ...artist.toPublicJSON(),
                stats: { orders: ordersCount, creations: creationsCount, experience: artist.experience }
            };
        }));

        // Fetch categories
        const categories = await User.distinct('categories');
        const validCategories = categories.filter(c => c).slice(0, 4).map(c => ({ name: c }));

        res.json({
            popularArtists: artistsWithStats,
            categories: validCategories
        });
    } catch (error) {
        console.error('Error fetching home data:', error);
        res.status(500).json({ error: 'fetch_failed' });
    }
});

// Get popular artists
router.get('/popular-artists', async (req, res) => {
    try {
        // Fetch artists
        let artists = await User.find({ artist_mode_enabled: true }).limit(50); // Fetch more for sorting

        // If not enough, fetch any users
        if (artists.length < 4) {
            const others = await User.find({
                artist_mode_enabled: false,
                _id: { $nin: artists.map(a => a._id) }
            }).limit(20);
            artists = artists.concat(others);
        }

        // Calculate stats for sorting
        const artistsWithStats = await Promise.all(artists.map(async (artist) => {
            const ordersCount = await Request.countDocuments({ requesterId: artist._id });
            // Creations count from gallery
            const creationsCount = artist.creationsGallery ? artist.creationsGallery.length : 0;

            return {
                ...artist.toPublicJSON(),
                stats: {
                    orders: ordersCount,
                    creations: creationsCount,
                    experience: artist.experience
                }
            };
        }));

        // Sort by creations desc
        artistsWithStats.sort((a, b) => b.stats.creations - a.stats.creations);

        res.json(artistsWithStats.slice(0, 4));
    } catch (error) {
        console.error('Error fetching popular artists:', error);
        res.status(500).json({ error: 'fetch_failed' });
    }
});

// Get popular categories
router.get('/random-categories', async (req, res) => {
    try {
        // Aggregate categories from artists
        const artists = await User.find({
            artist_mode_enabled: true,
            categories: { $exists: true, $not: { $size: 0 } }
        }).select('categories');

        const categoryCount = {};
        artists.forEach(artist => {
            artist.categories.forEach(cat => {
                categoryCount[cat] = (categoryCount[cat] || 0) + 1;
            });
        });

        let topCategories = Object.keys(categoryCount)
            .sort((a, b) => categoryCount[b] - categoryCount[a])
            .slice(0, 4);

        // If not enough, add some defaults
        const defaults = ['Digital Art', 'Traditional Art', 'Illustration', 'Logo Design'];
        for (const def of defaults) {
            if (topCategories.length >= 4) break;
            if (!topCategories.includes(def)) topCategories.push(def);
        }

        // Format as objects (mocking structure if frontend needs objects)
        // Frontend likely expects objects if it was fetching from 'categories' table
        // Existing code: res.json(sortedCategories) where sortedCategories were rows from 'categories' table
        // Let's assume frontend uses .name
        const result = topCategories.map(name => ({ name }));

        res.json(result);
    } catch (error) {
        console.error('Error fetching popular categories:', error);
        res.status(500).json({ error: 'fetch_failed' });
    }
});

// Get random creations
router.get('/random-creations', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const maxLimit = 50;
        let finalLimit = Math.min(parseInt(limit, 10) || 10, maxLimit);

        // Fetch artists who have items in creationsGallery
        const artists = await User.find({
            artist_mode_enabled: true,
            'creationsGallery.0': { $exists: true }
        }).select('username creationsGallery');

        if (artists.length === 0) return res.json([]);

        // Shuffle artists
        const randomArtists = artists.sort(() => 0.5 - Math.random()).slice(0, finalLimit);

        const creations = [];
        for (const artist of randomArtists) {
            const gallery = artist.creationsGallery;
            const randomCreation = gallery[Math.floor(Math.random() * gallery.length)];

            if (randomCreation && randomCreation.imageUrl) {
                creations.push({
                    image_url: randomCreation.imageUrl,
                    caption: randomCreation.title || 'Untitled Creation',
                    user: {
                        id: artist._id,
                        username: artist.username
                    }
                });
            }
        }

        res.json(creations);
    } catch (error) {
        console.error('Error fetching random creations:', error);
        res.status(500).json({ error: 'fetch_failed' });
    }
});

module.exports = router;