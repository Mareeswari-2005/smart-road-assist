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
    const allShops = await Shop.find().populate('mechanicId', 'name email phone');
    
    if (allShops.length === 0) {
      return res.json({ 
        message: 'No mechanics found in database',
        mechanics: [] 
      });
    }
    
    let mechanicsData = allShops.map(shop => ({
      _id: shop._id,
      id: shop.mechanicId._id,
      name: shop.shopName,
      owner: shop.mechanicId.name,
      email: shop.mechanicId.email,
      phone: shop.mechanicId.phone,
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
    const { lat, lng, service } = req.query;
    
    if (!lat || !lng || !service) {
      return res.status(400).json({ message: 'Latitude, longitude, and service are required' });
    }
    
    // First, check if any mechanics exist at all
    const totalShops = await Shop.countDocuments();
    const onlineShops = await Shop.countDocuments({ isOnline: true });
    
    console.log(`Search request - Total shops: ${totalShops}, Online: ${onlineShops}, Service: ${service}`);
    
    // Find all online mechanics with the requested service
    const shops = await Shop.find({
      isOnline: true,
      services: { $in: [service] }
    }).populate('mechanicId', 'name email phone');
    
    console.log(`Found ${shops.length} mechanics for service: ${service}`);
    
    if (shops.length === 0) {
      // Check if there are mechanics with other services
      const anyOnlineMechanics = await Shop.find({ isOnline: true }).populate('mechanicId', 'name');
      
      let message = 'No mechanics available in your area.';
      if (anyOnlineMechanics.length === 0) {
        message += ' No mechanics are currently online.';
      } else {
        message += ` However, ${anyOnlineMechanics.length} mechanics are online with other services.`;
      }
      
      return res.json({ 
        mechanics: [], 
        message,
        debug: {
          totalShops,
          onlineShops,
          requestedService: service,
          availableServices: [...new Set(anyOnlineMechanics.flatMap(s => s.services))]
        }
      });
    }
    
    // Calculate distance and sort by proximity
    const mechanicsWithDistance = shops.map(shop => {
      const distance = calculateDistance(
        parseFloat(lat), parseFloat(lng),
        shop.location?.coordinates?.[1] || 0,
        shop.location?.coordinates?.[0] || 0
      );
      
      return {
        _id: shop._id,
        id: shop.mechanicId._id,
        name: shop.shopName,
        owner: shop.mechanicId.name,
        email: shop.mechanicId.email,
        phone: shop.mechanicId.phone,
        address: shop.address,
        services: shop.services,
        rating: shop.averageRating || 4.5,
        distance: distance.toFixed(1),
        hours: shop.workingHours ? `${shop.workingHours.open} - ${shop.workingHours.close}` : '24/7'
      };
    }).sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    
    res.json({ mechanics: mechanicsWithDistance });
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