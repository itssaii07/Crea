// Custom Authentication Service (JWT based)
// Replaces Supabase Auth

class AuthService {
  constructor() {
    this.currentUser = null;
    this.token = localStorage.getItem('token');

    // Handle OAuth callback if token is in URL
    this.handleOAuthCallback();
  }

  // Handle OAuth redirect callback
  handleOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const provider = urlParams.get('provider');
    const error = urlParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      return;
    }

    if (token && provider) {
      // Store the token
      this.token = token;
      localStorage.setItem('token', token);

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);

      // Redirect to home
      window.location.href = '/home.html';
    }
  }

  // Get current user from backend using token
  async getCurrentUser() {
    if (!this.token) return null;

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (response.ok) {
        this.currentUser = await response.json();
        return this.currentUser;
      } else {
        // Token invalid or expired
        this.performLogout();
        return null;
      }
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  // Sign up with email and password
  async signUp(email, password, userData = {}) {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          username: userData.username || email.split('@')[0],
          name: userData.name || '',
          role: userData.role || 'user'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      this.setSession(data.token, data.user);
      return { user: data.user };
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  // Sign in with email and password
  async signIn(email, password) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      this.setSession(data.token, data.user);
      return { user: data.user };
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  // Helper to set session
  setSession(token, user) {
    this.token = token;
    this.currentUser = user;
    localStorage.setItem('token', token);
    this.onSignIn(user);
  }

  // Sign out
  async signOut() {
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem('token');
    this.onSignOut();
  }

  // Callbacks
  onSignIn(user) {
    console.log('User signed in:', user.email);
    if (window.location.pathname.includes('auth.html')) {
      window.location.href = '/home.html';
    }
  }

  onSignOut() {
    console.log('User signed out');
    if (!window.location.pathname.includes('entry.html') && !window.location.pathname.includes('auth.html')) {
      // Only redirect if we are on a protected page
      // For now, let's redirect to entry
      window.location.href = '/entry.html';
    }
  }

  isAuthenticated() {
    return !!this.token;
  }

  async getAuthHeader() {
    if (!this.token) return null;
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  // Make authenticated API call
  async apiCall(url, options = {}) {
    const headers = await this.getAuthHeader();
    if (!headers) {
      // If we don't have a token, we can't make an auth call
      // Maybe return a 401 response mock or throw
      throw new Error('Not authenticated');
    }

    // Merge headers
    const mergedHeaders = { ...headers, ...options.headers };

    const response = await fetch(url, {
      ...options,
      headers: mergedHeaders
    });

    if (response.status === 401) {
      // Token might be expired
      this.signOut();
    }

    return response;
  }

  // Compatibility methods for existing code
  getUserDisplayName() {
    return this.currentUser?.name || this.currentUser?.username || '';
  }

  getUserAvatarUrl() {
    return this.currentUser?.profilePicUrl || '';
  }

  performLogout() {
    this.signOut();
  }
}

// Create global instance
window.authService = new AuthService();

// Check session on load (if token exists)
if (localStorage.getItem('token')) {
  window.authService.getCurrentUser();
}

export default window.authService;
export const performLogout = window.authService.performLogout.bind(window.authService);