const express = require('express');
const auth = require('../middleware/auth');
const { trackActivity } = require('../middleware/activityTracker');
const Request = require('../models/Request');
const User = require('../models/User');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const Chat = require('../models/Chat');

const router = express.Router();

// Create request (general or direct)
router.post('/', auth, trackActivity('request_created', 'request'), async (req, res) => {
  try {
    const { title, description, category, keywords, location, price, imageUrl, specificArtist, targetArtistId } = req.body;
    // Handle both specificArtist (from general form) and targetArtistId (from artist profile)
    const targetArtist = specificArtist || targetArtistId;
    const visibility = targetArtist ? 'direct' : 'general';

    // User is already attached by auth middleware
    const user = req.user;

    const requestData = {
      title,
      description,
      category,
      keywords,
      location,
      price,
      imageUrl,
      requesterId: user._id,
      specificArtistId: targetArtist || null,
      visibility,
      status: 'active'
    };

    const request = await Request.create(requestData);

    console.log('Request created:', {
      id: request._id,
      requesterId: request.requesterId,
      specificArtistId: request.specificArtistId,
      visibility: request.visibility
    });

    if (targetArtist) {
      const sendNotification = req.app.get('sendNotification');
      if (sendNotification) {
        await sendNotification(targetArtist, 'request_assigned', { title, requestId: request._id });
      }
    }

    res.json(request.toPublicJSON());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'create_failed' });
  }
});

// List: general pool (active, not assigned), filterable
router.get('/general', auth, async (req, res) => {
  try {
    const { category, location, limit = 20 } = req.query;
    const filters = {};

    if (category) filters.category = category;
    if (location) filters.location = location;

    const user = req.user;

    const requests = await Request.getGeneralRequests(user._id, filters, parseInt(limit));
    res.json(requests.map(request => request.toPublicJSON()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

// List: my requests (as requester)
router.get('/my', auth, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const user = req.user;

    const requests = await Request.getUserRequests(user._id, parseInt(limit));
    res.json(requests.map(request => request.toPublicJSON()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

// List: assigned to me (as artist)
router.get('/assigned', auth, async (req, res) => {
  try {
    // Legacy endpoint, mostly unused or similar to accepted
    res.json([]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

// List: accepted by me (as artist)
router.get('/accepted', auth, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const user = req.user;

    const requests = await Request.getAcceptedRequests(user._id, parseInt(limit));
    res.json(requests.map(request => request.toPublicJSON()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

// Accept request (artist accepts)
router.post('/:id/accept', auth, trackActivity('request_accepted', 'request'), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'request_not_found' });
    }

    const user = req.user;

    await request.accept(user._id);

    // Reset mark-as-done flags when request is accepted
    request.requester_marked_done = false;
    request.artist_marked_done = false;
    await request.save();

    const sendNotification = req.app.get('sendNotification');
    await sendNotification(request.requesterId, 'request_accepted', { title: request.title, requestId: request._id });

    res.json({ message: 'Request accepted', request: request.toPublicJSON() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'accept_failed' });
  }
});

// Reject request (artist rejects)
router.post('/:id/reject', auth, trackActivity('request_rejected', 'request'), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'request_not_found' });
    }

    const user = req.user;

    // Check if user is the specific artist for the request
    if (request.specificArtistId && String(request.specificArtistId) !== String(user._id)) {
      return res.status(403).json({ error: 'not_authorized' });
    }

    await request.reject();

    const sendNotification = req.app.get('sendNotification');
    await sendNotification(request.requesterId, 'request_rejected', { title: request.title, requestId: request._id });

    res.json({ message: 'Request rejected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'reject_failed' });
  }
});

// Mark-as-done workflow: creator must initiate first, then requester can complete
router.post('/:id/mark-done', auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'request_not_found' });
    }

    const user = req.user;

    const isRequester = String(request.requesterId) === String(user._id);
    const isArtist = String(request.assignedArtistId || request.specificArtistId) === String(user._id);

    if (!isRequester && !isArtist) {
      return res.status(403).json({ error: 'not_participant' });
    }

    // Check if requester is trying to mark done before creator
    if (isRequester && !request.artist_marked_done) {
      return res.json({ error: 'creator_must_initiate' });
    }

    // Update flags based on who is marking
    let creatorMarkedFirst = false;
    if (isArtist && !request.artist_marked_done) {
      request.artist_marked_done = true;
      // Ensure assignedId is set if not already (redundant but safe)
      if (!request.assignedArtistId) request.assignedArtistId = user._id;
      await request.save();
      creatorMarkedFirst = true;
    } else if (isRequester && !request.requester_marked_done) {
      request.requester_marked_done = true;
      await request.save();
    }

    // If both have marked done, set status completed and record creations/orders
    let completedNow = false;
    if (request.requester_marked_done && request.artist_marked_done) {
      await request.complete();
      completedNow = true;

      // Record completion activity for both requester (orders) and artist (creations)
      try {
        const artistId = request.assignedArtistId || request.specificArtistId;
        if (artistId) {
          // Add to artist's creation gallery
          if (request.imageUrl) {
            await User.findByIdAndUpdate(artistId, {
              $push: { creationsGallery: { title: request.title, imageUrl: request.imageUrl } }
            });
          }

          await Activity.create({
            userId: artistId,
            activityType: 'request_completed',
            metadata: {
              request_id: request._id,
              title: request.title,
              imageUrl: request.imageUrl,
              artist_id: artistId
            }
          });
        }

        await Activity.create({
          userId: request.requesterId,
          activityType: 'request_completed',
          metadata: {
            request_id: request._id,
            title: request.title,
            imageUrl: request.imageUrl,
            artist_id: artistId || null
          }
        });
      } catch (e) {
        console.warn('Failed to insert completion activity:', e?.message || e);
      }
    }

    // Notify participants
    const sendNotification = req.app.get('sendNotification');
    if (sendNotification) {
      if (isRequester) {
        await sendNotification(request.assignedArtistId || request.specificArtistId, 'requester_marked_done', { requestId: request._id, title: request.title });
      }
      if (isArtist) {
        await sendNotification(request.requesterId, 'artist_marked_done', { requestId: request._id, title: request.title });
      }
      if (completedNow) {
        await sendNotification(request.requesterId, 'request_completed', { requestId: request._id, title: request.title });
      }
    }

    // Handle Chat cleaning and notifications
    try {
      // Get chat for this request
      const chat = await Chat.findOne({ requestId: request._id });
      if (chat) {

        if (completedNow) {
          // Store notification for both participants
          for (const participantId of chat.participants) {
            await Notification.create({
              userId: participantId,
              type: 'chat_notification',
              title: 'Order Completed',
              message: 'order finished',
              payload: {
                chat_id: chat._id,
                notification_type: 'success'
              }
            });
          }

          // Remove chat
          await Chat.findByIdAndDelete(chat._id);

        } else if (creatorMarkedFirst) {
          // Notification for requester
          const requesterId = request.requesterId;
          if (requesterId && String(requesterId) !== String(user._id)) {
            await Notification.create({
              userId: requesterId,
              type: 'chat_notification',
              title: 'Order Status',
              message: 'please mark as done to finish the order',
              payload: {
                chat_id: chat._id,
                notification_type: 'info',
                request_id: request._id,
                status: 'creator_marked_done'
              }
            });
          }
        } else if (isRequester) {
          // Notification for creator
          const creatorId = request.assignedArtistId || request.specificArtistId;
          if (creatorId && String(creatorId) !== String(user._id)) {
            await Notification.create({
              userId: creatorId,
              type: 'chat_notification',
              title: 'Order Status',
              message: 'order marked as done, waiting for response',
              payload: {
                chat_id: chat._id,
                notification_type: 'info',
                request_id: request._id,
                status: 'requester_marked_done'
              }
            });
          }
        }
      }
    } catch (e) {
      console.warn('Failed to store chat notification:', e?.message || e);
    }

    res.json({
      message: 'marked_done',
      completed: completedNow,
      creator_marked_first: creatorMarkedFirst,
      request: request.toPublicJSON(),
    });
  } catch (err) {
    console.error('mark-done error:', err);
    res.status(500).json({ error: 'mark_done_failed', details: err?.message || String(err) });
  }
});

// Complete request (legacy direct-complete)
router.post('/:id/complete', auth, trackActivity('request_completed', 'request'), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'request_not_found' });
    }

    await request.complete();

    // Record completion activity for both requester (orders) and artist (creations)
    try {
      const artistId = request.assignedArtistId || request.specificArtistId;
      if (artistId) {
        await Activity.create({
          userId: artistId,
          activityType: 'request_completed',
          metadata: {
            request_id: request._id,
            title: request.title,
            imageUrl: request.imageUrl,
            artist_id: artistId
          }
        });
      }
      await Activity.create({
        userId: request.requesterId,
        activityType: 'request_completed',
        metadata: {
          request_id: request._id,
          title: request.title,
          imageUrl: request.imageUrl,
          artist_id: artistId || null
        }
      });
    } catch (e) {
      console.warn('Failed to insert completion activity:', e?.message || e);
    }

    const sendNotification = req.app.get('sendNotification');
    await sendNotification(request.requesterId, 'request_completed', { title: request.title, requestId: request._id });

    res.json({ message: 'Request completed', request: request.toPublicJSON() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'complete_failed' });
  }
});

// Abort request
router.post('/:id/abort', auth, trackActivity('request_aborted', 'request'), async (req, res) => {
  try {
    const { reason } = req.body;
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'request_not_found' });
    }

    const user = req.user;

    // Check if user is the requester (owner of the request)
    if (String(request.requesterId) === String(user._id)) {
      await Request.findByIdAndDelete(request._id);
      res.json({ message: 'Request deleted successfully' });
    } else if ((request.assignedArtistId && String(request.assignedArtistId) === String(user._id)) || (request.specificArtistId && String(request.specificArtistId) === String(user._id))) {
      // If it's an artist aborting an assigned request
      if (request.visibility === 'direct') {
        await Request.findByIdAndDelete(request._id);
        const sendNotification = req.app.get('sendNotification');
        if (sendNotification) {
          await sendNotification(request.requesterId, 'request_aborted', { title: request.title, reason });
        }
        res.json({ message: 'Request deleted' });
      } else {
        request.status = 'active';
        request.assignedArtistId = null;
        await request.save();

        const sendNotification = req.app.get('sendNotification');
        if (sendNotification) {
          await sendNotification(request.requesterId, 'request_aborted', { title: request.title, reason });
        }
        res.json({ message: 'Request aborted and returned to general pool', request: request.toPublicJSON() });
      }
    } else {
      return res.status(403).json({ error: 'not_authorized' });
    }
  } catch (err) {
    console.error('Error in abort request:', err);
    res.status(500).json({ error: 'abort_failed', details: err.message });
  }
});

// Simple delete endpoint for testing
router.delete('/:id', auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'request_not_found' });
    }

    const user = req.user;

    // Check if user owns the request
    if (String(request.requesterId) === String(user._id)) {
      await Request.findByIdAndDelete(request._id);
      res.json({ message: 'Request deleted successfully' });
    } else {
      res.status(403).json({ error: 'not_authorized' });
    }
  } catch (error) {
    console.error('Error in direct delete:', error);
    res.status(500).json({ error: 'delete_failed', details: error.message });
  }
});

// Get requests specifically for the current user (artist)
router.get("/for-me", auth, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const user = req.user;

    console.log('For-me query for user:', user._id);

    const requests = await Request.getAssignedRequests(user._id, parseInt(limit));

    console.log('For-me results:', requests.length, 'requests found');
    requests.forEach(r => console.log('  -', r.title, 'from', r.requesterId, 'to', r.specificArtistId));

    res.json(requests.map(request => request.toPublicJSON()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

module.exports = router;