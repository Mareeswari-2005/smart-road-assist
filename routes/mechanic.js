const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const Request = require('../models/Request');
const Shop = require('../models/Shop');
const { auth, mechanicAuth } = require('../middleware/auth');

const router = express.Router();

// Search mechanics by location and service
router.get('/search', auth, async (req, res) => {
  try {
    const { location, service } = req.query;
    
    console.log('Search request:', { location, service });
    
    // Find all online shops
    const shops = await Shop.find({ isOnline: true }).populate('mechanicId', 'name phone email');
    
    console.log('Found shops:', shops.length);
    
    // Convert to mechanics array
    const mechanics = shops.map(shop => ({
      _id: shop.mechanicId?._id || shop._id,
      name: shop.shopName || 'Mechanic Shop',
      address: shop.address || 'Address not available',
      phone: shop.mechanicId?.phone || 'Phone not available',
      services: shop.services || ['General repairs'],
      rating: shop.averageRating || 4.5,
      totalRatings: shop.totalRatings || 0,
      hours: '9:00 AM - 6:00 PM',
      distance: `${(Math.random() * 5 + 1).toFixed(1)} km`
    }));
    
    console.log('Returning mechanics:', mechanics.length);
    
    res.json({ mechanics });
  } catch (error) {
    console.error('Search mechanics error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper function to calculate distance (simplified)
function calculateDistance(location1, location2) {
  // Simple distance calculation - in real app, use proper geocoding
  if (!location1 || !location2) return 999;
  
  // If locations are coordinates
  if (location1.includes(',') && location2.includes(',')) {
    const [lat1, lng1] = location1.split(',').map(parseFloat);
    const [lat2, lng2] = location2.split(',').map(parseFloat);
    
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  // Simple text matching for addresses
  const loc1 = location1.toLowerCase();
  const loc2 = location2.toLowerCase();
  
  if (loc1.includes(loc2) || loc2.includes(loc1)) return 1;
  return 10; // Default distance for non-matching locations
}

// Get mechanic dashboard data
router.get('/dashboard', mechanicAuth, async (req, res) => {
  try {
    const shop = await Shop.findOne({ mechanicId: req.user._id });
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found. Please complete shop setup.' });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const totalRequests = await Request.countDocuments({
      mechanicId: req.user._id
    });
    
    const completedRequests = await Request.countDocuments({
      mechanicId: req.user._id,
      status: 'completed'
    });
    
    const todayEarnings = await Request.aggregate([
      { 
        $match: { 
          mechanicId: req.user._id, 
          status: 'completed',
          completedAt: { $gte: today }
        } 
      },
      { $group: { _id: null, total: { $sum: '$actualCost' } } }
    ]);
    
    res.json({
      totalRequests,
      completedRequests,
      todayEarnings: todayEarnings[0]?.total || 0,
      rating: shop.averageRating || 5.0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get mechanic stats
router.get('/stats', mechanicAuth, async (req, res) => {
  try {
    // Check if shop exists
    const shop = await Shop.findOne({ mechanicId: req.user._id });
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found. Please complete shop setup.' });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayJobs = await Request.countDocuments({
      mechanicId: req.user._id,
      createdAt: { $gte: today },
      status: 'completed'
    });
    
    const completedJobs = await Request.countDocuments({
      mechanicId: req.user._id,
      status: 'completed'
    });
    
    const totalEarnings = await Request.aggregate([
      { $match: { mechanicId: req.user._id, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$actualCost' } } }
    ]);
    
    res.json({
      todayJobs,
      completedJobs,
      totalEarnings: totalEarnings[0]?.total || 0,
      rating: shop.averageRating || 5.0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get available requests with location data
router.get('/requests', mechanicAuth, async (req, res) => {
  try {
    const requests = await Request.find({
      $or: [
        { status: 'pending', mechanicId: { $exists: false } }, // Unassigned pending requests
        { status: 'pending', mechanicId: req.user._id }, // Requests assigned to this mechanic
        { mechanicId: req.user._id, status: { $in: ['accepted', 'in-progress'] } } // Active jobs
      ]
    }).populate('userId', 'name phone email').sort({ createdAt: -1 });
    
    // Ensure location is properly formatted
    const requestsWithCoords = requests.map(request => {
      const requestObj = request.toObject();
      return {
        ...requestObj,
        user: request.userId,
        location: requestObj.locationAddress || 'Location not specified',
        coordinates: {
          lat: 40.7128 + (Math.random() - 0.5) * 0.1,
          lng: -74.0060 + (Math.random() - 0.5) * 0.1
        }
      };
    });
    
    res.json({ requests: requestsWithCoords });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Accept request
router.put('/request/:id/accept', mechanicAuth, async (req, res) => {
  try {
    console.log('Accept request - ID:', req.params.id, 'Mechanic:', req.user._id);
    
    const request = await Request.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { 
        mechanicId: req.user._id,
        status: 'accepted',
        estimatedArrival: new Date(Date.now() + 30 * 60000) // 30 minutes from now
      },
      { new: true }
    ).populate('userId', 'name phone');

    console.log('Request found:', !!request);

    if (!request) {
      return res.status(404).json({ message: 'Request not found or already accepted' });
    }

    // Notify user with tracking info
    const io = req.app.get('io');
    if (io) {
      io.to(request.userId._id.toString()).emit('request-accepted', {
        requestId: request._id,
        mechanic: {
          name: req.user.name,
          phone: req.user.phone,
          id: req.user._id
        },
        estimatedArrival: request.estimatedArrival,
        trackingEnabled: true
      });
      console.log('Notification sent to user:', request.userId._id.toString());
    }

    res.json({ request });
  } catch (error) {
    console.error('Accept request error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Decline request
router.put('/request/:id/decline', mechanicAuth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request is no longer available' });
    }
    
    // Just return success - request remains pending for other mechanics
    res.json({ message: 'Request declined successfully' });
  } catch (error) {
    console.error('Decline request error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Complete request
router.put('/request/:id/complete', mechanicAuth, async (req, res) => {
  try {
    const request = await Request.findOneAndUpdate(
      { _id: req.params.id, mechanicId: req.user._id },
      { 
        status: 'completed',
        completedAt: new Date(),
        actualCost: req.body.cost || 500
      },
      { new: true }
    ).populate('userId', '_id name');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Send email notification to user about completion
    try {
      await sendCompletionEmail(request.userId.email, request, req.user);
    } catch (emailError) {
      console.error('Failed to send completion email:', emailError);
    }

    // Notify user that job is completed
    const io = req.app.get('io');
    if (io && request.userId) {
      const completionData = {
        requestId: request._id,
        message: 'Your service request has been completed!',
        mechanicName: req.user.name
      };
      
      // Send to specific user room
      io.to(request.userId._id.toString()).emit('job-completed', completionData);
      
      // Broadcast to all users as fallback
      io.emit('job-completion-broadcast', {
        ...completionData,
        forUserId: request.userId._id.toString()
      });
      
      console.log('Job completion notification sent to user:', request.userId._id.toString());
    }

    res.json({ request });
  } catch (error) {
    console.error('Complete request error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Email notification function for job completion
async function sendCompletionEmail(userEmail, request, mechanic) {
  try {
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: 'Service Completed - Smart Road Assistance',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4ecdc4;">✅ Service Completed Successfully!</h2>
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px;">
            <p><strong>Service Type:</strong> ${request.serviceType}</p>
            <p><strong>Mechanic:</strong> ${mechanic.name}</p>
            <p><strong>Phone:</strong> ${mechanic.phone}</p>
            <p><strong>Location:</strong> ${request.locationAddress}</p>
            <p><strong>Completed At:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Total Cost:</strong> ₹${request.actualCost || request.estimatedCost}</p>
          </div>
          <p style="margin-top: 20px;">Thank you for using Smart Road Assistance! Please rate your experience in the app.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Completion email sent to user:', userEmail);
  } catch (error) {
    console.error('Completion email error:', error.message);
  }
}

// Get mechanic earnings data
router.get('/earnings', mechanicAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Get earnings aggregations
    const [todayEarnings, weekEarnings, monthEarnings, totalEarnings, recentJobs] = await Promise.all([
      Request.aggregate([
        { $match: { mechanicId: req.user._id, status: 'completed', completedAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$actualCost' } } }
      ]),
      Request.aggregate([
        { $match: { mechanicId: req.user._id, status: 'completed', completedAt: { $gte: startOfWeek } } },
        { $group: { _id: null, total: { $sum: '$actualCost' } } }
      ]),
      Request.aggregate([
        { $match: { mechanicId: req.user._id, status: 'completed', completedAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$actualCost' } } }
      ]),
      Request.aggregate([
        { $match: { mechanicId: req.user._id, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$actualCost' } } }
      ]),
      Request.find({ mechanicId: req.user._id, status: 'completed' })
        .sort({ completedAt: -1 })
        .limit(5)
        .select('serviceType actualCost estimatedCost completedAt')
    ]);
    
    res.json({
      todayEarnings: todayEarnings[0]?.total || 0,
      weekEarnings: weekEarnings[0]?.total || 0,
      monthEarnings: monthEarnings[0]?.total || 0,
      totalEarnings: totalEarnings[0]?.total || 0,
      recentJobs
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get mechanic job history
router.get('/history', mechanicAuth, async (req, res) => {
  try {
    const jobs = await Request.find({ mechanicId: req.user._id })
      .populate('userId', 'name phone email')
      .sort({ createdAt: -1 });
    
    res.json({ jobs });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get active job
router.get('/active-job', mechanicAuth, async (req, res) => {
  try {
    const job = await Request.findOne({ 
      mechanicId: req.user._id, 
      status: { $in: ['accepted', 'in-progress'] }
    }).populate('userId', 'name phone email');
    
    if (job) {
      // Ensure user data is properly formatted and location is a string
      const jobData = {
        ...job.toObject(),
        user: job.userId,
        locationAddress: job.locationAddress || 'Location not specified'
      };
      res.json({ job: jobData });
    } else {
      res.json({ job: null });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update online status
router.put('/status', mechanicAuth, async (req, res) => {
  try {
    const { isOnline } = req.body;
    
    await Shop.findOneAndUpdate(
      { mechanicId: req.user._id },
      { isOnline },
      { upsert: true }
    );
    
    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update availability
router.put('/availability', mechanicAuth, async (req, res) => {
  try {
    const { available } = req.body;
    
    await Shop.findOneAndUpdate(
      { mechanicId: req.user._id },
      { isOnline: available },
      { upsert: true }
    );
    
    res.json({ message: 'Availability updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update mechanic location for tracking
router.put('/location', mechanicAuth, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    console.log('Mechanic location update:', { mechanicId: req.user._id, lat, lng });
    
    // Update shop location
    await Shop.findOneAndUpdate(
      { mechanicId: req.user._id },
      {
        $set: {
          'location.lat': lat,
          'location.lng': lng,
          'location.timestamp': new Date()
        }
      },
      { upsert: true }
    );
    
    // Find active job
    const activeJob = await Request.findOneAndUpdate(
      {
        mechanicId: req.user._id,
        status: { $in: ['accepted', 'in-progress'] }
      },
      {
        $set: {
          'mechanicLocation.lat': lat,
          'mechanicLocation.lng': lng,
          'mechanicLocation.timestamp': new Date()
        }
      },
      { new: true }
    ).populate('userId', '_id name');
    
    console.log('Active job found:', activeJob ? activeJob._id : 'none');
    
    if (activeJob) {
      const io = req.app.get('io');
      const locationData = {
        requestId: activeJob._id,
        mechanicLocation: { lat, lng },
        timestamp: new Date()
      };
      
      // Send to specific user room
      io.to(activeJob.userId._id.toString()).emit('mechanic-location', locationData);
      
      // Broadcast to all users (fallback)
      io.emit('location-update', {
        ...locationData,
        forUserId: activeJob.userId._id.toString()
      });
      
      console.log('Location sent to user:', activeJob.userId._id.toString());
    }
    
    res.json({ message: 'Location updated', success: true });
  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;