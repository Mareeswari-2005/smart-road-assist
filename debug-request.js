const mongoose = require('mongoose');
require('dotenv').config();

// Test MongoDB connection
async function testConnection() {
  try {
    console.log('Testing MongoDB connection...');
    console.log('MongoDB URI:', process.env.MONGODB_URI);
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
    
    // Test User model
    const User = require('./models/User');
    const userCount = await User.countDocuments();
    console.log(`✅ Users in database: ${userCount}`);
    
    // Test Request model
    const Request = require('./models/Request');
    const requestCount = await Request.countDocuments();
    console.log(`✅ Requests in database: ${requestCount}`);
    
    await mongoose.disconnect();
    console.log('✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    process.exit(1);
  }
}

testConnection();