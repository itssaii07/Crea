// Real-time Subscriptions Service (Stubbed for MongoDB Migration)
// Supabase Realtime is removed. 
// TODO: Implement Socket.io or Polling for real-time updates.

class RealtimeService {
  constructor() {
    this.subscriptions = new Map();
    this.isConnected = true; // Pretend we are connected
    console.log('RealtimeService (Stub) initialized');
  }

  setupConnectionListener() {
    // No-op
  }

  subscribeToChatMessages(chatId, callback) {
    console.log(`[Stub] Subscribed to chat messages: ${chatId}`);
    // Return dummy subscription object
    return { unsubscribe: () => { } };
  }

  subscribeToNotifications(userId, callback) {
    console.log(`[Stub] Subscribed to notifications: ${userId}`);
    return { unsubscribe: () => { } };
  }

  subscribeToRequests(callback, filters = {}) {
    console.log(`[Stub] Subscribed to requests`);
    return { unsubscribe: () => { } };
  }

  subscribeToUserActivities(userId, callback) {
    console.log(`[Stub] Subscribed to activities: ${userId}`);
    return { unsubscribe: () => { } };
  }

  subscribeToChatList(userId, callback) {
    console.log(`[Stub] Subscribed to chat list: ${userId}`);
    return { unsubscribe: () => { } };
  }

  subscribeToUserProfile(userId, callback) {
    console.log(`[Stub] Subscribed to profile: ${userId}`);
    return { unsubscribe: () => { } };
  }

  unsubscribe(subscriptionKey) {
    console.log(`[Stub] Unsubscribed from: ${subscriptionKey}`);
  }

  unsubscribeAll() {
    console.log(`[Stub] Unsubscribed all`);
  }

  getSubscriptionStatus(subscriptionKey) {
    return 'SUBSCRIBED';
  }

  getActiveSubscriptions() {
    return [];
  }

  isRealtimeConnected() {
    return true;
  }

  cleanup() {
    this.unsubscribeAll();
  }
}

// Create global realtime service instance
window.realtimeService = new RealtimeService();

export default window.realtimeService;
