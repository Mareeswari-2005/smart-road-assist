const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const Request = require('../models/Request');
const User = require('../models/User');
const Shop = require('../models/Shop');
const { auth } = require('../middleware/auth');
const { sendMechanicNotification } = require('../services/emailService');

const router = express.Router();

// Create service request
router.post('/create', auth, async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('User:', req.user);
    
    let { serviceType, description, location, urgency, mechanicEmail, mechanicId, shopId } = req.body;
    
    // Handle shopId (when user clicks on mechanic card)
    if (shopId) {
      try {
        const shop = await Shop.findById(shopId).populate('mechanicId');
        if (shop && shop.mechanicId) {
          mechanicId = shop.mechanicId._id;
          mechanicEmail = shop.mechanicId.email;
          console.log('Found mechanic from shop:', { mechanicId, mechanicEmail });
        } else {
          return res.status(400).json({ 
            message: 'Shop not found or no mechanic assigned'
          });
        }
      } catch (shopError) {
        console.error('Shop lookup error:', shopError);
        return res.status(400).json({ 
          message: 'Invalid shop ID'
        });
      }
    }
    
    // Handle both mechanicEmail and mechanicId (for backward compatibility)
    let mechanicObjectId = null;
    if (mechanicId) {
      // If mechanicId is provided, use it directly
      if (mongoose.Types.ObjectId.isValid(mechanicId)) {
        const mechanic = await User.findById(mechanicId);
        if (mechanic && mechanic.userType === 'mechanic') {
          mechanicObjectId = mechanic._id;
        } else {
          return res.status(400).json({ 
            message: 'Mechanic not found', 
            error: 'No mechanic found with the provided ID'
          });
        }
      } else {
        return res.status(400).json({ 
          message: 'Invalid mechanic ID format'
        });
      }
    } else if (mechanicEmail) {
      // Find mechanic by email if provided
      const mechanic = await User.findOne({ email: mechanicEmail, userType: 'mechanic' });
      if (!mechanic) {
        return res.status(400).json({ 
          message: 'Mechanic not found', 
          error: 'No mechanic found with the provided email'
        });
      }
      mechanicObjectId = mechanic._id;
    }
    
    // Validate required fields and set defaults
    if (!serviceType || !location) {
      return res.status(400).json({ 
        message: 'Missing required fields', 
        required: ['serviceType', 'location'],
        received: { serviceType, description, location }
      });
    }
    
    // Set default description if empty
    if (!description || !description.trim()) {
      description = `${serviceType} service requested`;
    }

    // Validate user exists
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    // Parse location with better error handling
    let locationCoords;
    let locationAddress = location;
    
    try {
      if (typeof location === 'string') {
        if (location.includes(',')) {
          // It's coordinates
          const coords = location.split(',').map(coord => {
            const num = parseFloat(coord.trim());
            if (isNaN(num)) throw new Error('Invalid coordinate');
            return num;
          });
          
          if (coords.length !== 2) {
            throw new Error('Invalid coordinate format');
          }
          
          locationCoords = { lat: coords[0], lng: coords[1] };
          locationAddress = location;
        } else {
          // It's an address - use default coordinates for now
          locationCoords = { lat: 0, lng: 0 };
          locationAddress = location;
        }
      } else if (location && typeof location === 'object' && location.lat && location.lng) {
        locationCoords = location;
        locationAddress = `${location.lat}, ${location.lng}`;
      } else {
        // Default fallback
        locationCoords = { lat: 0, lng: 0 };
        locationAddress = location || 'Location not specified';
      }
    } catch (locError) {
      console.error('Location parsing error:', locError);
      // Use default coordinates as fallback
      locationCoords = { lat: 0, lng: 0 };
      locationAddress = location || 'Location not specified';
    }

    // Validate coordinates (skip validation for default coordinates)
    if (locationCoords.lat !== 0 && locationCoords.lng !== 0) {
      if (Math.abs(locationCoords.lat) > 90 || Math.abs(locationCoords.lng) > 180) {
        console.log('Invalid coordinates, using defaults');
        locationCoords = { lat: 0, lng: 0 };
      }
    }

    // Create request with validation
    const requestData = {
      userId: req.user._id,
      serviceType,
      description,
      location: {
        type: 'Point',
        coordinates: [locationCoords.lng, locationCoords.lat]
      },
      locationAddress,
      urgency: urgency || 'medium',
      estimatedCost: getEstimatedCost(serviceType, urgency || 'medium'),
      status: mechanicObjectId ? 'pending' : 'pending' // Set to pending for mechanic assignment
    };

    // Add mechanicId if specified (for direct assignment)
    if (mechanicObjectId && mechanicObjectId !== req.user._id) {
      requestData.mechanicId = mechanicObjectId;
    }

    console.log('Creating request with data:', requestData);
    
    const request = new Request(requestData);
    await request.save();

    // Send notifications if mechanic is specified
    if (mechanicObjectId) {
      console.log('Sending notifications to mechanic:', mechanicObjectId);
      const mechanic = await User.findById(mechanicObjectId);
      if (mechanic) {
        console.log('Mechanic found:', mechanic.email);
        
        // Send email notification using the email service
        if (mechanic.email) {
          const requestDetails = {
            serviceType: request.serviceType,
            customerName: req.user.name,
            location: locationAddress,
            description: request.description,
            estimatedCost: request.estimatedCost
          };
          
          const emailSent = await sendMechanicNotification(mechanic.email, mechanic.name, requestDetails);
          if (emailSent) {
            console.log('Email notification sent successfully to:', mechanic.email);
          } else {
            console.log('Email notification failed - check server logs');
          }
        } else {
          console.log('Mechanic has no email address - skipping email notification');
        }
        
        // Send dashboard notification via socket
        const io = req.app.get('io');
        if (io) {
          const notificationData = {
            requestId: request._id,
            serviceType: request.serviceType,
            location: request.locationAddress,
            urgency: request.urgency,
            customerName: req.user.name,
            customerPhone: req.user.phone,
            description: request.description,
            estimatedCost: request.estimatedCost,
            createdAt: request.createdAt
          };
          
          // Send to specific mechanic room
          io.to(mechanicObjectId.toString()).emit('new-request', notificationData);
          
          // Also broadcast to all mechanics as fallback
          io.emit('mechanic-notification', {
            ...notificationData,
            forMechanicId: mechanicObjectId.toString()
          });
          
          console.log('Dashboard notification sent to:', mechanicObjectId.toString());
        } else {
          console.error('Socket.io not available');
        }
      } else {
        console.log('Mechanic not found with ID:', mechanicObjectId);
      }
    } else {
      console.log('No specific mechanic - broadcasting to all available mechanics');
      
      // Broadcast to all available mechanics
      const io = req.app.get('io');
      if (io) {
        io.emit('new-general-request', {
          requestId: request._id,
          serviceType: request.serviceType,
          location: request.locationAddress,
          urgency: request.urgency,
          customerName: req.user.name,
          description: request.description,
          estimatedCost: request.estimatedCost
        });
      }
    }

    console.log('Request created successfully:', request._id);

    res.status(201).json({
      message: 'Request created successfully',
      request: {
        ...request.toObject(),
        location: request.locationAddress // Return readable location
      }
    });
  } catch (error) {
    console.error('Create request error:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        error: error.message,
        details: error.errors 
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        message: 'Invalid data format', 
        error: error.message 
      });
    }
    
    res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get user requests history
router.get('/history', auth, async (req, res) => {
  try {
    const requests = await Request.find({ userId: req.user._id })
      .populate('mechanicId', 'name phone')
      .sort({ createdAt: -1 });
    
    res.json({ requests });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's active request
router.get('/user/active-request', auth, async (req, res) => {
  try {
    const request = await Request.findOne({ 
      userId: req.user._id, 
      status: { $in: ['pending', 'accepted', 'in-progress'] }
    }).populate('mechanicId', 'name phone');
    
    res.json({ request });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get active request
router.get('/active', auth, async (req, res) => {
  try {
    const request = await Request.findOne({ 
      userId: req.user._id, 
      status: { $in: ['pending', 'accepted', 'in-progress'] }
    }).populate('mechanicId', 'name phone');
    
    res.json({ request });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get request by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('userId', 'name phone')
      .populate('mechanicId', 'name phone');
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    // Check if user has permission to view this request
    if (request.userId._id.toString() !== req.user._id.toString() && 
        (!request.mechanicId || request.mechanicId._id.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(request);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Cancel request (PUT method for frontend)
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const request = await Request.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id, status: { $in: ['pending', 'accepted', 'in-progress'] } },
      { status: 'cancelled', cancelledAt: new Date() },
      { new: true }
    ).populate('mechanicId', 'name phone email');

    if (!request) {
      return res.status(404).json({ message: 'Request not found or cannot be cancelled' });
    }

    // Notify mechanic if assigned
    if (request.mechanicId) {
      const io = req.app.get('io');
      if (io) {
        const notificationData = {
          requestId: request._id.toString(),
          customerName: req.user.name,
          serviceType: request.serviceType,
          mechanicId: request.mechanicId._id.toString()
        };
        
        console.log('Broadcasting cancellation to all clients:', notificationData);
        // Broadcast to ALL connected clients
        io.emit('request-cancelled-broadcast', notificationData);
        console.log('Cancellation broadcast sent');
      }
    }

    res.json({ message: 'Request cancelled successfully', request });
  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Accept request (for mechanics)
router.put('/:id/accept', auth, async (req, res) => {
  try {
    const request = await Request.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { 
        mechanicId: req.user._id,
        status: 'accepted',
        estimatedArrival: new Date(Date.now() + 30 * 60000)
      },
      { new: true }
    ).populate('userId', 'name phone');

    if (!request) {
      return res.status(404).json({ message: 'Request not found or already accepted' });
    }

    // Notify user
    const io = req.app.get('io');
    if (io) {
      io.to(request.userId._id.toString()).emit('request-accepted', {
        requestId: request._id,
        mechanic: {
          name: req.user.name,
          phone: req.user.phone,
          id: req.user._id
        },
        estimatedArrival: request.estimatedArrival
      });
    }

    res.json({ request });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Decline request (for mechanics)
router.put('/:id/decline', auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request is no longer available' });
    }
    
    res.json({ message: 'Request declined successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Complete request (for mechanics)
router.put('/:id/complete', auth, async (req, res) => {
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

    // Notify user
    const io = req.app.get('io');
    if (io && request.userId) {
      io.to(request.userId._id.toString()).emit('job-completed', {
        requestId: request._id,
        message: 'Your service request has been completed!',
        mechanicName: req.user.name
      });
    }

    res.json({ request });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

function getEstimatedCost(serviceType, urgency) {
  const baseCosts = {
    'tire-repair': 500,
    'battery-jump': 300,
    'fuel-delivery': 200,
    'towing': 1000,
    'lockout': 400
  };
  
  const urgencyMultiplier = urgency === 'high' ? 1.5 : 1;
  return (baseCosts[serviceType] || 500) * urgencyMultiplier;
}

// Rate mechanic after job completion
router.put('/:id/rate', auth, async (req, res) => {
  try {
    const { rating, review } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    
    const request = await Request.findOneAndUpdate(
      { 
        _id: req.params.id, 
        userId: req.user._id, 
        status: 'completed',
        rating: { $exists: false } // Prevent multiple ratings
      },
      { 
        rating,
        review: review || '',
        ratedAt: new Date()
      },
      { new: true }
    ).populate('mechanicId', 'name');

    if (!request) {
      return res.status(404).json({ message: 'Request not found or already rated' });
    }

    // Update shop's rating
    const shop = await Shop.findOne({ mechanicId: request.mechanicId._id });
    
    if (shop) {
      // Add rating to shop
      shop.ratings.push({
        userId: req.user._id,
        rating: rating,
        comment: review || '',
        createdAt: new Date()
      });
      
      // Update average rating
      shop.updateAverageRating();
      
      // Save only the modified fields to avoid validation issues
      await Shop.findByIdAndUpdate(shop._id, {
        ratings: shop.ratings,
        averageRating: shop.averageRating,
        totalRatings: shop.totalRatings
      });
      
      console.log(`Updated shop rating: ${shop.averageRating} (${shop.totalRatings} reviews)`);
    }

    res.json({ message: 'Rating submitted successfully', request });
  } catch (error) {
    console.error('Rating submission error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;