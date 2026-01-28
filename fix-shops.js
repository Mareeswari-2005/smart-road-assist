const mongoose = require('mongoose');
const User = require('./models/User');
const Shop = require('./models/Shop');
require('dotenv').config();

async function fixShopsData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // First, update existing shop to be online and fix services
    const existingShop = await Shop.findOne({});
    if (existingShop) {
      existingShop.isOnline = true;
      existingShop.services = ['tire-repair', 'battery-jump', 'fuel-delivery', 'towing', 'lockout'];
      await existingShop.save();
      console.log('Updated existing shop to be online with correct services');
    }

    // Add sample mechanics with correct service names
    const sampleMechanics = [
      {
        name: 'John Smith',
        email: 'john.smith.new@example.com',
        phone: '+1234567890',
        password: 'password123',
        role: 'mechanic',
        shopName: 'Quick Fix Auto',
        services: ['tire-repair', 'battery-jump', 'fuel-delivery'],
        address: 'Downtown, Main Street, City Center',
        coordinates: [-74.0060, 40.7128]
      },
      {
        name: 'Mike Johnson',
        email: 'mike.johnson.new@example.com',
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
        email: 'sarah.wilson.new@example.com',
        phone: '+1234567892',
        password: 'password123',
        role: 'mechanic',
        shopName: 'Mobile Mechanic Pro',
        services: ['tire-repair', 'fuel-delivery', 'other'],
        address: 'Westside, Pine Street, West End',
        coordinates: [-74.0260, 40.7328]
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
        averageRating: 4.5 + Math.random() * 0.5,
        totalRatings: Math.floor(Math.random() * 50) + 10,
        isOnline: true,
        isVerified: true
      });

      await shop.save();
      console.log(`Created shop: ${mechanicData.shopName}`);
    }

    // Verify the data
    const allShops = await Shop.find({}).populate('mechanicId', 'name phone email');
    console.log(`\nTotal shops in database: ${allShops.length}`);
    console.log(`Online shops: ${allShops.filter(s => s.isOnline).length}`);
    
    allShops.forEach((shop, index) => {
      console.log(`${index + 1}. ${shop.shopName} - Online: ${shop.isOnline} - Services: ${shop.services.join(', ')}`);
    });

    console.log('\nShops data fixed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing shops data:', error);
    process.exit(1);
  }
}

fixShopsData();