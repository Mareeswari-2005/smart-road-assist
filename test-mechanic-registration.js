const mongoose = require('mongoose');
const User = require('./models/User');
const Shop = require('./models/Shop');
require('dotenv').config();

async function testMechanicRegistration() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Test data for a new mechanic
    const testMechanic = {
      email: 'testmechanic@example.com',
      password: 'password123',
      name: 'Test Mechanic',
      phone: '1234567890',
      userType: 'mechanic',
      shopName: 'Test Auto Shop',
      address: 'Test Address, Test City',
      latitude: 12.9716,
      longitude: 77.5946,
      services: ['Engine Repair', 'Tire Change', 'Battery Jump']
    };
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: testMechanic.email });
    if (existingUser) {
      console.log('Test user already exists, cleaning up...');
      await Shop.deleteOne({ mechanicId: existingUser._id });
      await User.deleteOne({ _id: existingUser._id });
    }
    
    // Create user
    const user = new User({
      email: testMechanic.email,
      password: testMechanic.password,
      name: testMechanic.name,
      phone: testMechanic.phone,
      userType: testMechanic.userType
    });
    
    await user.save();
    console.log('✅ User created successfully');
    
    // Create shop
    const shop = new Shop({
      mechanicId: user._id,
      shopName: testMechanic.shopName,
      services: testMechanic.services,
      phone: testMechanic.phone,
      address: testMechanic.address,
      location: {
        type: 'Point',
        coordinates: [testMechanic.longitude, testMechanic.latitude]
      },
      workingHours: { open: '09:00', close: '18:00' }
    });
    
    await shop.save();
    console.log('✅ Shop created successfully');
    
    // Verify the data
    const savedUser = await User.findById(user._id);
    const savedShop = await Shop.findOne({ mechanicId: user._id });
    
    console.log('\n📊 Verification:');
    console.log(`User ID: ${savedUser._id}`);
    console.log(`User Type: ${savedUser.userType}`);
    console.log(`Shop Name: ${savedShop.shopName}`);
    console.log(`Shop Address: ${savedShop.address}`);
    console.log(`Shop Location: [${savedShop.location.coordinates[1]}, ${savedShop.location.coordinates[0]}]`);
    console.log(`Services: ${savedShop.services.join(', ')}`);
    
    console.log('\n✅ Test completed successfully! Mechanic registration is working.');
    
    // Clean up test data
    await Shop.deleteOne({ _id: savedShop._id });
    await User.deleteOne({ _id: savedUser._id });
    console.log('🧹 Test data cleaned up');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testMechanicRegistration();