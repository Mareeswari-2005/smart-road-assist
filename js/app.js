// Common utility functions
class SmartRoadAssistance {
  constructor() {
    this.baseURL = '/api';
    this.token = this.getToken();
  }

  // Get token from localStorage or sessionStorage or cookie
  getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token') || this.getCookie('token');
  }

  // Set token in both storages for persistence
  setToken(token) {
    localStorage.setItem('token', token);
    sessionStorage.setItem('token', token);
  }

  // Remove token from all storages
  removeToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }

  // Get cookie value
  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  }

  // Make API request
  async apiRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // Show alert message
  showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    const container = document.querySelector('.container');
    if (container) {
      container.insertBefore(alertDiv, container.firstChild);
      setTimeout(() => alertDiv.remove(), 5000);
    }
  }

  // Format date
  formatDate(dateString) {
    return new Date(dateString).toLocaleString();
  }

  // Get user location
  async getUserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        position => resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }),
        error => reject(error),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  // Generate device ID
  generateDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + Date.now();
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  // Auto-login with device ID
  async autoLogin() {
    const deviceId = this.generateDeviceId();
    
    try {
      const response = await fetch(`${this.baseURL}/auth/auto-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId })
      });
      
      if (response.ok) {
        const result = await response.json();
        this.setToken(result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        sessionStorage.setItem('user', JSON.stringify(result.user));
        return result;
      }
    } catch (error) {
      console.error('Auto-login failed:', error);
    }
    
    return null;
  }

  // Check if user is logged in
  isLoggedIn() {
    return !!this.token;
  }

  // Redirect to login if not authenticated
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = '/login';
      return false;
    }
    return true;
  }

  // Logout user
  logout() {
    this.removeToken();
    window.location.href = '/';
  }
}

// Initialize app
const app = new SmartRoadAssistance();

// Common event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Auto-hide alerts
  const alerts = document.querySelectorAll('.alert');
  alerts.forEach(alert => {
    setTimeout(() => {
      if (alert.parentNode) {
        alert.remove();
      }
    }, 5000);
  });

  // Form validation
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      const requiredFields = form.querySelectorAll('[required]');
      let isValid = true;

      requiredFields.forEach(field => {
        if (!field.value.trim()) {
          field.style.borderColor = '#dc3545';
          isValid = false;
        } else {
          field.style.borderColor = '#e1e5e9';
        }
      });

      if (!isValid) {
        e.preventDefault();
        app.showAlert('Please fill in all required fields', 'danger');
      }
    });
  });
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SmartRoadAssistance;
}