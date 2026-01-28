const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Shop = require('../models/Shop');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone, userType, deviceId, shopName, address, services, latitude, longitude } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({
      email,
      password,
      name,
      phone,
      userType,
      deviceId
    });

    await user.save();

    // If mechanic, create shop record
    if (userType === 'mechanic' && shopName && address) {
      const shop = new Shop({
        mechanicId: user._id,
        shopName,
        services: Array.isArray(services) ? services : [services],
        phone: phone, // Use user's phone as shop phone
        address,
        location: {
          type: 'Point',
          coordinates: [longitude || 0, latitude || 0] // [lng, lat] format for MongoDB
        },
        workingHours: { open: '09:00', close: '18:00' },
        isOnline: true // Set new mechanics online by default
      });

      await shop.save();
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        userType: user.userType
      },
      token,
      needsShopSetup: false // Shop is already created
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, deviceId } = req.body;
    
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update device ID and last login
    user.deviceId = deviceId;
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    // Check if mechanic has shop setup
    let needsShopSetup = false;
    if (user.userType === 'mechanic') {
      const shop = await Shop.findOne({ mechanicId: user._id });
      needsShopSetup = !shop;
    }

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        userType: user.userType
      },
      token,
      needsShopSetup
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Auto-login with device ID
router.post('/auto-login', async (req, res) => {
  try {
    const { deviceId } = req.body;
    
    const user = await User.findOne({ deviceId });
    if (!user) {
      return res.status(404).json({ message: 'Device not registered' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    let needsShopSetup = false;
    if (user.userType === 'mechanic') {
      const shop = await Shop.findOne({ mechanicId: user._id });
      needsShopSetup = !shop;
    }

    res.json({
      message: 'Auto-login successful',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        userType: user.userType
      },
      token,
      needsShopSetup
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Setup shop for mechanic
router.post('/setup-shop', auth, async (req, res) => {
  try {
    if (req.user.userType !== 'mechanic') {
      return res.status(403).json({ message: 'Only mechanics can setup shops' });
    }

    const { shopName, services, phone, address, latitude, longitude, workingHours } = req.body;
    
    // Check if shop already exists
    const existingShop = await Shop.findOne({ mechanicId: req.user._id });
    if (existingShop) {
      return res.status(400).json({ message: 'Shop already exists' });
    }

    const shop = new Shop({
      mechanicId: req.user._id,
      shopName,
      services: Array.isArray(services) ? services : [services],
      phone,
      address,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      workingHours: workingHours || { open: '09:00', close: '18:00' },
      isOnline: true // Set new shops online by default
    });

    await shop.save();

    res.status(201).json({
      message: 'Shop setup completed successfully',
      shop: {
        id: shop._id,
        shopName: shop.shopName,
        services: shop.services,
        address: shop.address
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify token
router.get('/verify', auth, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      email: req.user.email,
      name: req.user.name,
      userType: req.user.userType
    }
  });
});

module.exports = router;