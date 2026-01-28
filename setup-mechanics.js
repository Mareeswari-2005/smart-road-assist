const mongoose = require('mongoose');
const User = require('./models/User');
const Shop = require('./models/Shop');
require('dotenv').config();

async function setupMechanics() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing mechanics and shops
    await User.deleteMany({ userType: 'mechanic' });
    await Shop.deleteMany({});
    console.log('Cleared existing mechanics and shops');

    // Sample mechanics data
    const mechanics = [
      {
        name: 'John Smith',
        email: 'john.mechanic@example.com',
        phone: '+1234567890',
        password: 'password123',
        shopName: 'Quick Fix Auto',
        services: ['tire-repair', 'battery-jump', 'fuel-delivery'],
        address: 'Downtown, Main Street, City Center',
        coordinates: [-74.0060, 40.7128]
      },
      {
        name: 'Mike Johnson',
        email: 'mike.mechanic@example.com',
        phone: '+1234567891',
        password: 'password123',
        shopName: 'Road Rescue Services',
        services: ['towing', 'lockout', 'battery-jump'],
        address: 'Uptown, Oak Avenue, North District',
        coordinates: [-74.0160, 40.7228]
      },
      {
        name: 'Sarah Wilson',
        email: 'sarah.mechanic@example.com',
        phone: '+1234567892',
        password: 'password123',
        shopName: 'Mobile Mechanic Pro',
        services: ['tire-repair', 'fuel-delivery', 'other'],
        address: 'Westside, Pine Street, West End',
        coordinates: [-74.0260, 40.7328]
      }
    ];

    for (const mechanicData of mechanics) {
      // Create user
      const user = new User({
        name: mechanicData.name,
        email: mechanicData.email,
        phone: mechanicData.phone,
        password: mechanicData.password,
        userType: 'mechanic'
      });

      await user.save();
      console.log(`Created mechanic user: ${mechanicData.name}`);

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
        averageRating: 4.5 + Math.random() * 0.5,
        totalRatings: Math.floor(Math.random() * 50) + 10,
        isOnline: true,
        isVerified: true
      });

      await shop.save();
      console.log(`Created shop: ${mechanicData.shopName}`);
    }

    console.log('✅ Mechanics setup completed successfully!');
    console.log('You can now:');
    console.log('1. Login as a mechanic using any of the emails above with password: password123');
    console.log('2. Search for mechanics as a user');
    console.log('3. Send requests to specific mechanics');
    
    process.exit(0);
  } catch (error) {
    console.error('Error setting up mechanics:', error);
    process.exit(1);
  }
}

setupMechanics();