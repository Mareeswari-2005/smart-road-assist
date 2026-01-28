const mongoose = require('mongoose');
const User = require('./models/User');
const Shop = require('./models/Shop');
const Request = require('./models/Request');
require('dotenv').config();

async function clearDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear all test/fake data
    await User.deleteMany({});
    await Shop.deleteMany({});
    await Request.deleteMany({});

    console.log('Database cleared successfully!');
    console.log('All fake/test data removed.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  }
}

clearDatabase();