const mongoose = require('mongoose');
const User = require('./models/User');
const Shop = require('./models/Shop');
require('dotenv').config();

async function addSampleMechanics() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Sample mechanics data
    const sampleMechanics = [
      {
        name: 'John Smith',
        email: 'john.smith@example.com',
        phone: '+1234567890',
        password: 'password123',
        role: 'mechanic',
        shopName: 'Quick Fix Auto',
        services: ['tire-repair', 'battery-jump', 'fuel-delivery'],
        address: 'Downtown, Main Street, City Center',
        coordinates: [-74.0060, 40.7128] // [longitude, latitude] for NYC
      },
      {
        name: 'Mike Johnson',
        email: 'mike.johnson@example.com',
        phone: '+1234567891',
        password: 'password123',
        role: 'mechanic',
        shopName: 'Road Rescue Services',
        services: ['towing', 'lockout', 'battery-jump'],
        address: 'Uptown, Oak Avenue, North District',
        coordinates: [-74.0160, 40.7228]
      },
      {
        name: 'Sarah Wilson',
        email: 'sarah.wilson@example.com',
        phone: '+1234567892',
        password: 'password123',
        role: 'mechanic',
        shopName: 'Mobile Mechanic Pro',
        services: ['tire-repair', 'fuel-delivery', 'other'],
        address: 'Westside, Pine Street, West End',
        coordinates: [-74.0260, 40.7328]
      },
      {
        name: 'David Brown',
        email: 'david.brown@example.com',
        phone: '+1234567893',
        password: 'password123',
        role: 'mechanic',
        shopName: 'Emergency Auto Help',
        services: ['battery-jump', 'towing', 'lockout'],
        address: 'Eastside, Elm Street, East District',
        coordinates: [-73.9960, 40.7028]
      },
      {
        name: 'Lisa Garcia',
        email: 'lisa.garcia@example.com',
        phone: '+1234567894',
        password: 'password123',
        role: 'mechanic',
        shopName: '24/7 Auto Assist',
        services: ['tire-repair', 'battery-jump', 'fuel-delivery', 'other'],
        address: 'Southside, Maple Avenue, South End',
        coordinates: [-74.0360, 40.6928]
      }
    ];

    for (const mechanicData of sampleMechanics) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: mechanicData.email });
      if (existingUser) {
        console.log(`User ${mechanicData.email} already exists, skipping...`);
        continue;
      }

      // Create user
      const user = new User({
        name: mechanicData.name,
        email: mechanicData.email,
        phone: mechanicData.phone,
        password: mechanicData.password,
        userType: mechanicData.role
      });

      await user.save();
      console.log(`Created user: ${mechanicData.name}`);

      // Create shop
      const shop = new Shop({
        mechanicId: user._id,
        shopName: mechanicData.shopName,
        services: mechanicData.services,
        phone: mechanicData.phone,
        address: mechanicData.address,
        location: {
          type: 'Point',
          coordinates: mechanicData.coordinates
        },
        averageRating: 4.5 + Math.random() * 0.5, // Random rating between 4.5-5.0
        totalRatings: Math.floor(Math.random() * 50) + 10, // Random ratings count
        isOnline: true,
        isVerified: true
      });

      await shop.save();
      console.log(`Created shop: ${mechanicData.shopName}`);
    }

    console.log('Sample mechanics added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding sample mechanics:', error);
    process.exit(1);
  }
}

addSampleMechanics();