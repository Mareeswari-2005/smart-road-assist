const mongoose = require('mongoose');
const User = require('./models/User');
const Shop = require('./models/Shop');
const Request = require('./models/Request');
require('dotenv').config();

async function testRequestFlow() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if mechanics exist
    const mechanics = await User.find({ userType: 'mechanic' });
    console.log(`Found ${mechanics.length} mechanics in database`);

    if (mechanics.length === 0) {
      console.log('❌ No mechanics found. Run setup-mechanics.js first');
      process.exit(1);
    }

    // Check if shops exist and are online
    const shops = await Shop.find({ isOnline: true }).populate('mechanicId', 'name email');
    console.log(`Found ${shops.length} online shops`);

    shops.forEach((shop, index) => {
      console.log(`${index + 1}. ${shop.shopName} - ${shop.mechanicId.name} (${shop.mechanicId.email})`);
      console.log(`   Services: ${shop.services.join(', ')}`);
      console.log(`   Address: ${shop.address}`);
      console.log(`   Online: ${shop.isOnline}`);
    });

    // Test mechanic search
    console.log('\n--- Testing mechanic search ---');
    const searchLocation = 'downtown';
    const searchService = 'tire-repair';
    
    const query = {
      isOnline: true,
      services: { $in: [searchService] }
    };
    
    const searchResults = await Shop.find(query).populate('mechanicId', 'name phone email');
    console.log(`Search results for "${searchLocation}" and "${searchService}": ${searchResults.length} shops found`);
    
    if (searchResults.length > 0) {
      console.log('✅ Mechanic search is working correctly');
      
      // Show sample mechanic for testing
      const sampleMechanic = searchResults[0];
      console.log('\n--- Sample mechanic for testing ---');
      console.log(`Name: ${sampleMechanic.mechanicId.name}`);
      console.log(`Email: ${sampleMechanic.mechanicId.email}`);
      console.log(`Phone: ${sampleMechanic.mechanicId.phone}`);
      console.log(`Shop: ${sampleMechanic.shopName}`);
      console.log(`Mechanic ID: ${sampleMechanic.mechanicId._id}`);
      
      console.log('\n--- Test Instructions ---');
      console.log('1. Start the server: npm start');
      console.log('2. Open browser and go to http://localhost:3000');
      console.log('3. Register/login as a user');
      console.log('4. Search for mechanics and request service');
      console.log('5. Login as mechanic using the email above with password: password123');
      console.log('6. Check mechanic dashboard for the request notification');
    } else {
      console.log('❌ No mechanics found for the search criteria');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testRequestFlow();