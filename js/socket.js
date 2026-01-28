// Socket.IO client for real-time features
class SocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  // Initialize socket connection
  init(userId) {
    if (typeof io === 'undefined') {
      console.error('Socket.IO not loaded');
      return;
    }

    this.socket = io();
    this.userId = userId;

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Join user room
      if (this.userId) {
        this.socket.emit('join-room', this.userId);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isConnected = false;
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.handleReconnect();
    });

    // Listen for new requests (for mechanics)
    this.socket.on('new-request', (data) => {
      this.handleNewRequest(data);
    });

    // Listen for request status updates (for users)
    this.socket.on('request-status-update', (data) => {
      this.handleStatusUpdate(data);
    });

    // Listen for mechanic location updates (for users)
    this.socket.on('mechanic-location-update', (data) => {
      this.handleLocationUpdate(data);
    });

    // Listen for request cancellations (for mechanics)
    this.socket.on('request-cancelled', (data) => {
      this.handleRequestCancelled(data);
    });

    // Listen for request cancellation broadcasts (for mechanics)
    this.socket.on('request-cancelled-broadcast', (data) => {
      this.handleRequestCancelled(data);
    });
  }

  // Handle reconnection
  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Reconnection attempt ${this.reconnectAttempts}`);
        this.socket.connect();
      }, 2000 * this.reconnectAttempts);
    }
  }

  // Send mechanic location update
  sendLocationUpdate(userId, location) {
    if (this.isConnected) {
      this.socket.emit('mechanic-location', {
        userId: userId,
        location: location
      });
    }
  }

  // Handle new request notification (for mechanics)
  handleNewRequest(data) {
    // Show notification
    this.showNotification('New Service Request', {
      body: `${data.user} needs ${data.serviceType}`,
      icon: '/favicon.ico'
    });

    // Play notification sound
    this.playNotificationSound();

    // Update UI if on mechanic dashboard
    if (window.location.pathname === '/mechanic-dashboard') {
      this.refreshRequestsList();
    }
  }

  // Handle status update (for users)
  handleStatusUpdate(data) {
    const statusMessages = {
      'accepted': 'Your request has been accepted!',
      'in-progress': 'Mechanic is on the way!',
      'completed': 'Service completed successfully!',
      'cancelled': 'Request has been cancelled.'
    };

    const message = statusMessages[data.status] || 'Request status updated';
    
    this.showNotification('Request Update', {
      body: message,
      icon: '/favicon.ico'
    });

    // Update UI if on user dashboard
    if (window.location.pathname === '/user-dashboard') {
      this.updateRequestStatus(data.requestId, data.status);
    }
  }

  // Handle location update (for users)
  handleLocationUpdate(data) {
    // Update mechanic location on map if available
    if (typeof updateMechanicLocation === 'function') {
      updateMechanicLocation(data.location);
    }
  }

  // Handle request cancellation (for mechanics)
  handleRequestCancelled(data) {
    console.log('Request cancelled:', data);
    
    // Show notification to mechanic
    this.showNotification('Request Cancelled', {
      body: `${data.customerName} cancelled their ${data.serviceType} request`,
      icon: '/favicon.ico'
    });

    // Update UI if on mechanic dashboard
    if (window.location.pathname === '/mechanic-dashboard' || window.location.pathname === '/mobile-mechanic') {
      // Remove request from active requests list
      this.removeRequestFromList(data.requestId);
      
      // Update request status if it exists in the list
      this.updateRequestStatus(data.requestId, 'cancelled');
      
      // Refresh the requests list to ensure UI is up to date
      this.refreshRequestsList();
    }
    
    // Show toast notification if available
    if (typeof showToast === 'function') {
      showToast(`Request cancelled by ${data.customerName}`, 'info');
    }
  }

  // Show browser notification
  showNotification(title, options) {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, options);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(title, options);
          }
        });
      }
    }
  }

  // Play notification sound
  playNotificationSound() {
    const audio = new Audio('/sounds/notification.mp3');
    audio.play().catch(e => console.log('Could not play notification sound'));
  }

  // Refresh requests list
  refreshRequestsList() {
    if (typeof loadRequests === 'function') {
      loadRequests();
    }
  }

  // Update request status in UI
  updateRequestStatus(requestId, status) {
    const requestElement = document.querySelector(`[data-request-id="${requestId}"]`);
    if (requestElement) {
      const statusElement = requestElement.querySelector('.status');
      if (statusElement) {
        statusElement.textContent = status;
        statusElement.className = `status status-${status}`;
      }
    }
  }

  // Remove request from list
  removeRequestFromList(requestId) {
    const requestElement = document.querySelector(`[data-request-id="${requestId}"]`);
    if (requestElement) {
      requestElement.remove();
    }
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
    }
  }
}

// Initialize socket manager
const socketManager = new SocketManager();

// Auto-initialize if user is logged in
document.addEventListener('DOMContentLoaded', function() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.id) {
    socketManager.init(user.id);
  }
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SocketManager;
}