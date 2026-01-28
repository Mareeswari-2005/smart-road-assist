const mongoose = require('mongoose');
const User = require('./models/User');
const Shop = require('./models/Shop');
require('dotenv').config();

async function populateMechanics() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const mechanics = [
      {
        name: 'Quick Fix Auto',
        email: 'quickfix@example.com',
        phone: '+1234567890',
        services: ['tire-repair', 'battery-jump', 'fuel-delivery'],
        address: 'Main Street, Downtown',
        coordinates: [-74.0060, 40.7128]
      },
      {
        name: 'Road Rescue',
        email: 'rescue@example.com', 
        phone: '+1234567891',
        services: ['towing', 'lockout', 'battery-jump'],
        address: 'Oak Avenue, Uptown',
        coordinates: [-74.0160, 40.7228]
      }
    ];

    for (const mech of mechanics) {
      let user = await User.findOne({ email: mech.email });
      if (!user) {
        user = new User({
          name: mech.name,
          email: mech.email,
          phone: mech.phone,
          password: 'password123',
          userType: 'mechanic'
        });
        await user.save();
      }

      const existingShop = await Shop.findOne({ mechanicId: user._id });
      if (!existingShop) {
        const shop = new Shop({
          mechanicId: user._id,
          shopName: mech.name,
          services: mech.services,
          phone: mech.phone,
          email: mech.email,
          address: mech.address,
          location: {
            type: 'Point',
            coordinates: mech.coordinates
          },
          averageRating: 4.5,
          isOnline: true,
          isVerified: true
        });
        await shop.save();
        console.log(`Added: ${mech.name}`);
      }
    }
    
    console.log('Mechanics populated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

populateMechanics();