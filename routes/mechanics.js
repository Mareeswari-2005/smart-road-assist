const express = require('express');
const User = require('../models/User');
const Shop = require('../models/Shop');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get all mechanics - first by location, then remaining
router.get('/all', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    // Get all mechanics from database
    const allShops = await Shop.find();
    
    if (allShops.length === 0) {
      return res.json({ 
        message: 'No mechanics found in database',
        mechanics: [] 
      });
    }
    
    let mechanicsData = allShops.map(shop => ({
      _id: shop._id,
      id: shop.mechanicId,
      name: shop.shopName,
      owner: shop.shopName,
      email: shop.email,
      phone: shop.phone,
      address: shop.address,
      services: shop.services,
      rating: shop.averageRating || 4.5,
      isOnline: shop.isOnline,
      isVerified: shop.isVerified,
      location: shop.location,
      hours: shop.workingHours ? `${shop.workingHours.open} - ${shop.workingHours.close}` : '24/7'
    }));
    
    // If location provided, sort by distance
    if (lat && lng) {
      mechanicsData = mechanicsData.map(mechanic => {
        const distance = calculateDistance(
          parseFloat(lat), parseFloat(lng),
          mechanic.location?.coordinates?.[1] || 0,
          mechanic.location?.coordinates?.[0] || 0
        );
        return { ...mechanic, distance: distance.toFixed(1) };
      }).sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    }
    
    res.json({ 
      mechanics: mechanicsData,
      total: mechanicsData.length,
      online: mechanicsData.filter(m => m.isOnline).length
    });
  } catch (error) {
    console.error('Get all mechanics error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Search mechanics by location and service
router.get('/search', async (req, res) => {
  try {
    const { lat, lng, service, location } = req.query;
    
    if (!lat || !lng || !service) {
      return res.status(400).json({ message: 'Latitude, longitude, and service are required' });
    }
    
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const userLocation = location || '';
    
    // Get all mechanics
    const allShops = await Shop.find({});
    
    // Process all mechanics with location matching and distance
    const mechanicsWithPriority = await Promise.all(allShops.map(async shop => {
      const user = await User.findById(shop.mechanicId);
      const distance = calculateDistance(
        userLat, userLng,
        shop.location?.coordinates?.[1] || 0,
        shop.location?.coordinates?.[0] || 0
      );
      
      // Calculate location match score
      let locationScore = 0;
      const shopAddress = (shop.address || '').toLowerCase();
      const userLocationLower = userLocation.toLowerCase();
      
      // Extract location keywords from user input
      const locationKeywords = userLocationLower.split(/[,\s]+/).filter(word => word.length > 2);
      
      // Check for exact matches in address
      locationKeywords.forEach(keyword => {
        if (shopAddress.includes(keyword)) {
          locationScore += 10; // High score for keyword match
        }
      });
      
      // Check for state/city matches (common Indian location patterns)
      const commonStates = ['tamil nadu', 'karnataka', 'kerala', 'andhra pradesh', 'telangana', 'maharashtra', 'gujarat', 'rajasthan', 'punjab', 'haryana', 'uttar pradesh', 'bihar', 'west bengal', 'odisha', 'jharkhand', 'chhattisgarh', 'madhya pradesh', 'goa', 'himachal pradesh', 'uttarakhand', 'jammu and kashmir', 'ladakh', 'delhi', 'chandigarh', 'puducherry'];
      const commonCities = ['chennai', 'bangalore', 'mumbai', 'delhi', 'kolkata', 'hyderabad', 'pune', 'ahmedabad', 'surat', 'jaipur', 'lucknow', 'kanpur', 'nagpur', 'indore', 'thane', 'bhopal', 'visakhapatnam', 'pimpri', 'patna', 'vadodara', 'ghaziabad', 'ludhiana', 'agra', 'nashik', 'faridabad', 'meerut', 'rajkot', 'kalyan', 'vasai', 'varanasi', 'srinagar', 'aurangabad', 'dhanbad', 'amritsar', 'navi mumbai', 'allahabad', 'ranchi', 'howrah', 'coimbatore', 'jabalpur', 'gwalior', 'vijayawada', 'jodhpur', 'madurai', 'raipur', 'kota', 'guwahati', 'chandigarh', 'solapur', 'hubli', 'tiruchirappalli', 'bareilly', 'mysore', 'tiruppur', 'gurgaon', 'aligarh', 'jalandhar', 'bhubaneswar', 'salem', 'warangal', 'mira', 'bhiwandi', 'saharanpur', 'gorakhpur', 'bikaner', 'amravati', 'noida', 'jamshedpur', 'bhilai', 'cuttack', 'firozabad', 'kochi', 'nellore', 'bhavnagar', 'dehradun', 'durgapur', 'asansol', 'rourkela', 'nanded', 'kolhapur', 'ajmer', 'akola', 'gulbarga', 'jamnagar', 'ujjain', 'loni', 'siliguri', 'jhansi', 'ulhasnagar', 'jammu', 'sangli', 'mangalore', 'erode', 'belgaum', 'ambattur', 'tirunelveli', 'malegaon', 'gaya', 'jalgaon', 'udaipur', 'maheshtala'];
      
      [...commonStates, ...commonCities].forEach(place => {
        if (userLocationLower.includes(place) && shopAddress.includes(place)) {
          locationScore += 20; // Very high score for state/city match
        }
      });
      
      // Service match score
      const hasService = shop.services.includes(service);
      const serviceScore = hasService ? 100 : 0;
      
      // Distance score (closer = higher score)
      const distanceScore = Math.max(0, 50 - distance);
      
      // Total priority score
      const totalScore = serviceScore + locationScore + distanceScore;
      
      return {
        _id: shop._id,
        id: shop.mechanicId,
        name: shop.shopName,
        owner: user?.name || 'Unknown',
        email: user?.email || shop.email,
        phone: user?.phone || shop.phone,
        address: shop.address,
        services: shop.services,
        rating: shop.averageRating || 4.5,
        distance: distance.toFixed(1),
        hours: shop.workingHours && shop.workingHours.open && shop.workingHours.close ? `${shop.workingHours.open} - ${shop.workingHours.close}` : '24/7',
        isOnline: shop.isOnline,
        hasService,
        locationScore,
        totalScore
      };
    }));
    
    // Sort by total score (highest first), then by distance (closest first)
    const sortedMechanics = mechanicsWithPriority.sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      return parseFloat(a.distance) - parseFloat(b.distance);
    });
    
    res.json({ mechanics: sortedMechanics });
  } catch (error) {
    console.error('Search mechanics error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

module.exports = router;