const mongoose = require('mongoose');
const Shop = require('./models/Shop');
const User = require('./models/User');
require('dotenv').config();

async function testMechanicsSearch() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if shops exist
    const shops = await Shop.find({}).populate('mechanicId', 'name email phone');
    console.log(`Found ${shops.length} shops in database`);
    
    shops.forEach(shop => {
      console.log(`Shop: ${shop.shopName}, Online: ${shop.isOnline}, Services: ${shop.services.join(', ')}`);
      console.log(`Location: ${shop.location?.coordinates || 'No coordinates'}`);
      console.log(`Mechanic: ${shop.mechanicId?.name || 'No mechanic'}`);
      console.log('---');
    });

    // Test search with sample coordinates
    const testLat = 40.7128;
    const testLng = -74.0060;
    const testService = 'tire-repair';

    console.log(`\nTesting search with lat: ${testLat}, lng: ${testLng}, service: ${testService}`);
    
    const onlineShops = await Shop.find({
      isOnline: true,
      services: { $in: [testService] }
    }).populate('mechanicId', 'name email phone');
    
    console.log(`Found ${onlineShops.length} online shops with ${testService} service`);
    
    onlineShops.forEach(shop => {
      console.log(`- ${shop.shopName}: ${shop.mechanicId?.name}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testMechanicsSearch();