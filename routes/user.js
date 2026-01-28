const express = require('express');
const User = require('../models/User');
const Shop = require('../models/Shop');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user profile
router.patch('/profile', auth, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get nearby mechanics with location and address matching
router.get('/nearby-mechanics', auth, async (req, res) => {
  try {
    const { latitude, longitude, radius = 50000, address, city, area } = req.query; // Increased radius to 50km
    
    let query = {}; // Remove isOnline requirement for testing
    let addressQuery = [];
    
    // Location-based search (coordinates)
    if (latitude && longitude) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(radius)
        }
      };
    }
    
    // Address-based search (text matching)
    if (address || city || area) {
      const searchTerms = [];
      if (address) searchTerms.push(address);
      if (city) searchTerms.push(city);
      if (area) searchTerms.push(area);
      
      // Create regex patterns for flexible address matching
      const addressRegex = searchTerms.map(term => 
        new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      );
      
      addressQuery = addressRegex.map(regex => ({ address: { $regex: regex } }));
    }
    
    // If no specific search criteria, get all shops
    let finalQuery;
    if (addressQuery.length > 0 && (latitude && longitude)) {
      finalQuery = {
        $and: [
          query,
          { $or: addressQuery }
        ]
      };
    } else if (addressQuery.length > 0) {
      finalQuery = { $or: addressQuery };
    } else if (latitude && longitude) {
      finalQuery = query;
    } else {
      // Fallback: get all available shops
      finalQuery = {};
    }
    
    const shops = await Shop.find(finalQuery)
      .populate('mechanicId', 'name phone email')
      .select('shopName services phone address location averageRating totalRatings isOnline')
      .limit(50); // Increased limit
    
    const mechanics = shops.map(shop => ({
      id: shop._id,
      name: shop.mechanicId?.name || 'Unknown',
      shopName: shop.shopName,
      phone: shop.phone,
      email: shop.mechanicId?.email || '',
      services: shop.services || [],
      address: shop.address,
      location: {
        latitude: shop.location?.coordinates?.[1] || 0,
        longitude: shop.location?.coordinates?.[0] || 0
      },
      rating: parseFloat(shop.averageRating) || 5.0,
      totalRatings: shop.totalRatings || 0,
      isOnline: shop.isOnline !== false // Default to true if not set
    }));
    
    res.json({ mechanics, total: mechanics.length });
  } catch (error) {
    console.error('Error fetching mechanics:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Search shops by address/location text
router.get('/search-shops', auth, async (req, res) => {
  try {
    const { query: searchQuery, latitude, longitude, radius = 50000 } = req.query;
    
    if (!searchQuery) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    let dbQuery = {}; // Remove isOnline requirement
    
    // Text search in shop name and address
    const searchRegex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    dbQuery.$or = [
      { shopName: { $regex: searchRegex } },
      { address: { $regex: searchRegex } },
      { services: { $in: [searchRegex] } }
    ];
    
    // Add location filter if coordinates provided
    if (latitude && longitude) {
      dbQuery.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(radius)
        }
      };
    }
    
    const shops = await Shop.find(dbQuery)
      .populate('mechanicId', 'name phone email')
      .select('shopName services phone address location averageRating totalRatings isOnline')
      .limit(50);
    
    const mechanics = shops.map(shop => ({
      id: shop._id,
      name: shop.mechanicId?.name || 'Unknown',
      shopName: shop.shopName,
      phone: shop.phone,
      email: shop.mechanicId?.email || '',
      services: shop.services || [],
      address: shop.address,
      location: {
        latitude: shop.location?.coordinates?.[1] || 0,
        longitude: shop.location?.coordinates?.[0] || 0
      },
      rating: parseFloat(shop.averageRating) || 5.0,
      totalRatings: shop.totalRatings || 0,
      isOnline: shop.isOnline !== false
    }));
    
    res.json({ mechanics, total: mechanics.length });
  } catch (error) {
    console.error('Error searching shops:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all shops (for testing/debugging)
router.get('/all-shops', auth, async (req, res) => {
  try {
    const shops = await Shop.find({})
      .populate('mechanicId', 'name phone email')
      .select('shopName services phone address location averageRating totalRatings isOnline');
    
    const mechanics = shops.map(shop => ({
      id: shop._id,
      name: shop.mechanicId?.name || 'Unknown',
      shopName: shop.shopName,
      phone: shop.phone,
      email: shop.mechanicId?.email || '',
      services: shop.services || [],
      address: shop.address,
      location: {
        latitude: shop.location?.coordinates?.[1] || 0,
        longitude: shop.location?.coordinates?.[0] || 0
      },
      rating: parseFloat(shop.averageRating) || 5.0,
      totalRatings: shop.totalRatings || 0,
      isOnline: shop.isOnline !== false
    }));
    
    res.json({ mechanics, total: mechanics.length });
  } catch (error) {
    console.error('Error fetching all shops:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get mechanics for mobile app (temporarily remove auth for testing)
router.get('/mechanics', async (req, res) => {
  try {
    const { location } = req.query;
    
    let query = {};
    
    // If location is provided, search by address
    if (location) {
      const searchRegex = new RegExp(location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { address: { $regex: searchRegex } },
        { shopName: { $regex: searchRegex } }
      ];
    }
    
    const shops = await Shop.find(query)
      .populate('mechanicId', 'name phone email')
      .select('shopName services phone address averageRating totalRatings isOnline')
      .limit(20);
    
    const mechanics = shops.map(shop => ({
      _id: shop._id,
      name: shop.mechanicId?.name || 'Unknown Mechanic',
      shopName: shop.shopName || 'Mobile Service',
      phone: shop.phone || shop.mechanicId?.phone || 'N/A',
      services: shop.services || ['General Repair'],
      address: shop.address || 'Mobile Service',
      rating: parseFloat(shop.averageRating) || 5.0,
      isOnline: shop.isOnline !== false
    }));
    
    res.json({ mechanics });
  } catch (error) {
    console.error('Error fetching mechanics:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;