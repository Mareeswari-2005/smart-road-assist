const mongoose = require('mongoose');
const Shop = require('./models/Shop');
const User = require('./models/User');
require('dotenv').config();

async function debugShops() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const shops = await Shop.find({}).populate('mechanicId', 'name phone email');
    console.log(`Found ${shops.length} shops in database:`);
    
    shops.forEach((shop, index) => {
      console.log(`\n${index + 1}. ${shop.shopName || 'Unnamed Shop'}`);
      console.log(`   Address: ${shop.address}`);
      console.log(`   Services: ${shop.services.join(', ')}`);
      console.log(`   Online: ${shop.isOnline}`);
      console.log(`   Mechanic: ${shop.mechanicId?.name || 'No mechanic linked'}`);
      console.log(`   Phone: ${shop.mechanicId?.phone || shop.phone || 'No phone'}`);
    });

    // Test search query
    console.log('\n--- Testing search query ---');
    const testLocation = 'downtown';
    const testService = 'tire-repair';
    
    const query = {
      isOnline: true,
      services: { $in: [testService] }
    };
    
    console.log('Search query:', JSON.stringify(query, null, 2));
    
    const searchResults = await Shop.find(query).populate('mechanicId', 'name phone email');
    console.log(`Search results for "${testLocation}" and "${testService}": ${searchResults.length} shops found`);
    
    searchResults.forEach((shop, index) => {
      console.log(`${index + 1}. ${shop.shopName} - ${shop.address}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugShops();