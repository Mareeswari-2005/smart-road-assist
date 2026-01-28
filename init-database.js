const mongoose = require('mongoose');
require('dotenv').config();

async function initializeDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create indexes for better performance
    const User = require('./models/User');
    const Shop = require('./models/Shop');
    const Request = require('./models/Request');

    // Create unique indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await Shop.collection.createIndex({ mechanicId: 1 }, { unique: true });
    await Shop.collection.createIndex({ location: '2dsphere' });

    console.log('Database initialized successfully!');
    console.log('Ready for production use - no fake data included.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();