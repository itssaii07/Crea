// Real-time Chat Component (Refactored for MongoDB backend)

class ChatComponent {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = {
      autoScroll: true,
      showTyping: true,
      maxMessages: 100,
      ...options
    };
    this.currentChatId = null;
    this.messages = [];
    this.isTyping = false;
    this.typingUsersSet = new Set();
    this.pollInterval = null;

    this.initializeUI();
    this.setupEventListeners();
  }

  initializeUI() {
    this.container.innerHTML = `
      <div class="chat-container">
        <div class="chat-header">
          <h3 id="chatTitle">Select a chat</h3>
          <div class="chat-status">
            <span id="connectionStatus" class="status-indicator online">Connected</span>
          </div>
        </div>
        <div class="chat-messages" id="chatMessages">
          <div class="no-messages">No messages yet</div>
        </div>
        <div class="typing-indicator" id="typingIndicator" style="display: none;">
          <span id="typingUsers"></span> is typing...
        </div>
        <div class="chat-input-container">
          <input type="text" id="messageInput" placeholder="Type a message..." disabled>
          <button id="sendButton" disabled>Send</button>
        </div>
      </div>
    `;

    this.messagesContainer = document.getElementById('chatMessages');
    this.messageInput = document.getElementById('messageInput');
    this.sendButton = document.getElementById('sendButton');
    this.typingIndicator = document.getElementById('typingIndicator');
    this.typingUsersEl = document.getElementById('typingUsers');
    this.connectionStatus = document.getElementById('connectionStatus');
    this.chatTitle = document.getElementById('chatTitle');
  }

  setupEventListeners() {
    this.sendButton.addEventListener('click', () => this.sendMessage());
    this.messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendMessage();
      }
    });

    // Typing indicators
    this.messageInput.addEventListener('input', () => this.handleTyping());
    this.messageInput.addEventListener('blur', () => this.stopTyping());
  }

  // Get auth headers using localStorage token
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  // Get current user ID from localStorage or cached user
  getCurrentUserId() {
    // Try to get from cached user in localStorage
    const token = localStorage.getItem('token');
    if (!token) return null;

    // Decode JWT to get user ID (simple decode, not verification)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id;
    } catch (e) {
      return null;
    }
  }

  // Load a chat
  async loadChat(chatId) {
    if (this.currentChatId === chatId) return;

    // Stop polling previous chat
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.currentChatId = chatId;
    this.messages = [];
    this.renderMessages();

    try {
      // Get chat details and messages
      const response = await fetch(`/api/chats/${chatId}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to load chat');
      }

      const data = await response.json();
      this.messages = data.messages || [];
      this.renderMessages();
      this.updateChatTitle(data.chat);

      // Enable input
      this.setEnabled(true);

      // Start polling for new messages (simple real-time alternative)
      this.startPolling(chatId);

    } catch (error) {
      console.error('Error loading chat:', error);
      this.showError('Failed to load chat');
    }
  }

  // Poll for new messages (simple real-time alternative)
  startPolling(chatId) {
    this.pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/chats/${chatId}`, {
          headers: this.getAuthHeaders()
        });

        if (response.ok) {
          const data = await response.json();
          const newMessages = data.messages || [];

          // Only update if there are new messages
          if (newMessages.length > this.messages.length) {
            this.messages = newMessages;
            this.renderMessages();
            this.scrollToBottom();
          }
        }
      } catch (error) {
        console.warn('Polling error:', error);
      }
    }, 3000); // Poll every 3 seconds
  }

  // Send a message
  async sendMessage() {
    const text = this.messageInput.value.trim();
    if (!text || !this.currentChatId) return;

    this.messageInput.value = '';
    this.stopTyping();

    try {
      const response = await fetch(`/api/chats/${this.currentChatId}/messages`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const newMessage = await response.json();
      this.messages.push(newMessage);
      this.renderMessages();
      this.scrollToBottom();

    } catch (error) {
      console.error('Error sending message:', error);
      this.showError('Failed to send message');
    }
  }

  // Handle typing indicator
  handleTyping() {
    if (!this.isTyping && this.currentChatId) {
      this.isTyping = true;
    }
  }

  // Stop typing indicator
  stopTyping() {
    if (this.isTyping) {
      this.isTyping = false;
    }
  }

  // Render messages
  renderMessages() {
    if (this.messages.length === 0) {
      this.messagesContainer.innerHTML = '<div class="no-messages">No messages yet</div>';
      return;
    }

    this.messagesContainer.innerHTML = this.messages
      .map(message => this.renderMessage(message))
      .join('');
  }

  // Render individual message
  renderMessage(message) {
    const currentUserId = this.getCurrentUserId();
    const senderId = message.sender_id || message.senderId;
    const isOwn = senderId === currentUserId;
    const timestamp = new Date(message.created_at || message.createdAt).toLocaleTimeString();

    return `
      <div class="message ${isOwn ? 'own' : 'other'}">
        <div class="message-content">
          <div class="message-text">${this.escapeHtml(message.text || message.content)}</div>
          <div class="message-time">${timestamp}</div>
        </div>
      </div>
    `;
  }

  // Update chat title
  updateChatTitle(chat) {
    if (chat && chat.participants) {
      this.chatTitle.textContent = `Chat with ${chat.participants.length} participants`;
    }
  }

  // Scroll to bottom
  scrollToBottom() {
    if (this.options.autoScroll) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }

  // Show error message
  showError(message) {
    console.error(message);
  }

  // Escape HTML to prevent XSS
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Enable/disable chat input
  setEnabled(enabled) {
    this.messageInput.disabled = !enabled;
    this.sendButton.disabled = !enabled;
  }

  // Cleanup
  destroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    this.container.innerHTML = '';
  }
}

// Export for module usage
export default ChatComponent;
