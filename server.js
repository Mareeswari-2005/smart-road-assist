const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const { connectDB } = require('./config/database');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const mechanicRoutes = require('./routes/mechanic');
const userRoutes = require('./routes/user');
const requestRoutes = require('./routes/request');
const mechanicsRoutes = require('./routes/mechanics');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

// Database connections
connectDB()
  .then(() => console.log('Databases connected successfully'))
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

// Socket.IO for real-time features
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join', (data) => {
    console.log('User joined:', data.userId, 'Type:', data.userType);
    socket.join(data.userId);
  });
  
  socket.on('join-room', (userId) => {
    console.log('User joined room:', userId);
    socket.join(userId);
  });
  
  // Handle location sharing started event
  socket.on('location-sharing-started', (data) => {
    console.log('Location sharing started for request:', data.requestId);
    // Broadcast to all users that mechanic started sharing location
    socket.broadcast.emit('location-sharing-started', data);
  });
  
  // Handle mechanic location updates
  socket.on('mechanic-location-update', async (data) => {
    try {
      const { requestId, mechanicId, lat, lng, userId } = data;
      
      // Update request with mechanic location
      const Request = require('./models/Request');
      await Request.findByIdAndUpdate(requestId, {
        mechanicLocation: {
          lat: lat,
          lng: lng,
          timestamp: new Date()
        }
      });
      
      // Calculate distance and ETA
      const request = await Request.findById(requestId);
      if (request) {
        const distance = calculateDistance(
          lat, lng,
          request.location.coordinates[1], request.location.coordinates[0]
        );
        const eta = Math.ceil(distance * 2); // Rough ETA: 2 minutes per km
        
        // Send location update to user
        socket.to(userId).emit('mechanic-location-update', {
          requestId,
          mechanicId,
          location: { lat, lng },
          distance: distance.toFixed(1),
          eta: eta,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Error updating mechanic location:', error);
    }
  });
  
  // Handle request cancellations
  socket.on('request-cancelled', (data) => {
    console.log('Broadcasting request cancellation:', data);
    // Broadcast to all mechanics
    socket.broadcast.emit('request-cancelled', data);
  });
  
  // Handle request status updates
  socket.on('request-status-update', (data) => {
    socket.to(data.userId).emit('request-status-changed', data);
  });
  
  socket.on('mechanic-location', (data) => {
    socket.to(data.userId).emit('mechanic-location-update', data);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Make io accessible to routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/mechanic', mechanicRoutes);
app.use('/api/mechanics', mechanicsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/request', requestRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({ 
    message: 'Internal Server Error', 
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/mobile-login.html');
});

app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/public/mobile-login.html');
});

app.get('/register', (req, res) => {
  res.sendFile(__dirname + '/public/mobile-register.html');
});

app.get('/user-dashboard', (req, res) => {
  res.sendFile(__dirname + '/public/mobile-user.html');
});

app.get('/mechanic-dashboard', (req, res) => {
  res.sendFile(__dirname + '/public/mobile-mechanic.html');
});

// Mobile routes
app.get('/mobile-login', (req, res) => {
  res.sendFile(__dirname + '/public/mobile-login.html');
});

app.get('/mobile-register', (req, res) => {
  res.sendFile(__dirname + '/public/mobile-register.html');
});

app.get('/mobile-user', (req, res) => {
  res.sendFile(__dirname + '/public/mobile-user.html');
});

app.get('/mobile-mechanic', (req, res) => {
  res.sendFile(__dirname + '/public/mobile-mechanic.html');
});

app.get('/mobile-user-dashboard', (req, res) => {
  res.sendFile(__dirname + '/public/mobile-user-dashboard.html');
});

app.get('/mobile-find-mechanic', (req, res) => {
  res.sendFile(__dirname + '/public/mobile-find-mechanic.html');
});

app.get('/mobile-history', (req, res) => {
  res.sendFile(__dirname + '/public/mobile-history.html');
});

app.get('/mobile-profile', (req, res) => {
  res.sendFile(__dirname + '/public/mobile-profile.html');
});

app.get('/mobile-help', (req, res) => {
  res.sendFile(__dirname + '/public/mobile-help.html');
});

app.get('/mobile-find-mechanic', (req, res) => {
  res.sendFile(__dirname + '/public/mobile-find-mechanic.html');
});

app.get('/mobile-request-service', (req, res) => {
  res.sendFile(__dirname + '/public/mobile-request-service.html');
});

app.get('/all-mechanics', (req, res) => {
  res.sendFile(__dirname + '/public/all-mechanics.html');
});

// Legacy desktop routes (redirect to mobile)
app.get('/shop-setup', (req, res) => {
  res.redirect('/mobile-register');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});