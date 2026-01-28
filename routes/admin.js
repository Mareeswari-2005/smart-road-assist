const express = require('express');
const User = require('../models/User');
const Shop = require('../models/Shop');

const router = express.Router();

// Get all users (for debugging)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json({
      total: users.length,
      users: users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        phone: user.phone,
        createdAt: user.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all mechanics
router.get('/mechanics', async (req, res) => {
  try {
    const mechanics = await User.find({ userType: 'mechanic' }).select('-password');
    res.json({
      total: mechanics.length,
      mechanics: mechanics.map(mechanic => ({
        id: mechanic._id,
        name: mechanic.name,
        email: mechanic.email,
        phone: mechanic.phone,
        createdAt: mechanic.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all shops
router.get('/shops', async (req, res) => {
  try {
    const shops = await Shop.find({}).populate('mechanicId', 'name email phone');
    res.json({
      total: shops.length,
      shops
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;