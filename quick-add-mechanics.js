const { connectDB } = require('./config/database');
const User = require('./models/User');
const Shop = require('./models/Shop');
require('dotenv').config();

async function addMechanics() {
  try {
    await connectDB();
    console.log('Connected to databases');

    const sampleMechanics = [
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
      }
    ];

    for (const data of sampleMechanics) {
      const existingUser = await User.findOne({ email: data.email, userType: 'mechanic' });
      if (existingUser) {
        console.log(`Mechanic ${data.email} already exists`);
        continue;
      }

      const user = new User({
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        userType: 'mechanic'
      });

      await user.save();
      console.log(`Created mechanic user: ${data.name}`);

      const shop = new Shop({
        mechanicId: user._id,
        shopName: data.shopName,
        services: data.services,
        phone: data.phone,
        email: data.email,
        address: data.address,
        location: {
          type: 'Point',
          coordinates: data.coordinates
        },
        averageRating: 4.5,
        totalRatings: 25,
        isOnline: true,
        isVerified: true,
        workingHours: { open: '09:00', close: '18:00' }
      });

      await shop.save();
      console.log(`Created shop: ${data.shopName}`);
    }

    console.log('Mechanics added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addMechanics();