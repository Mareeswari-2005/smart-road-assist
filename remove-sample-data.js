const mongoose = require('mongoose');
const User = require('./models/User');
const Shop = require('./models/Shop');
require('dotenv').config();

async function removeSampleData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Sample email addresses to remove
    const sampleEmails = [
      'john.smith@example.com',
      'mike.johnson@example.com',
      'sarah.wilson@example.com',
      'david.brown@example.com',
      'lisa.garcia@example.com'
    ];

    console.log('Removing sample mechanics...');

    // Find and remove sample users and their shops
    for (const email of sampleEmails) {
      const user = await User.findOne({ email });
      if (user) {
        // Remove associated shop
        await Shop.deleteOne({ mechanicId: user._id });
        console.log(`Removed shop for: ${email}`);
        
        // Remove user
        await User.deleteOne({ email });
        console.log(`Removed user: ${email}`);
      }
    }

    // Also remove any shops without valid mechanic references
    const orphanedShops = await Shop.find().populate('mechanicId');
    for (const shop of orphanedShops) {
      if (!shop.mechanicId) {
        await Shop.deleteOne({ _id: shop._id });
        console.log(`Removed orphaned shop: ${shop.shopName}`);
      }
    }

    console.log('Sample data cleanup completed!');
    
    // Show remaining mechanics
    const remainingShops = await Shop.find().populate('mechanicId', 'name email');
    console.log(`\nRemaining mechanics: ${remainingShops.length}`);
    remainingShops.forEach(shop => {
      console.log(`- ${shop.shopName} (${shop.mechanicId.email})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error removing sample data:', error);
    process.exit(1);
  }
}

removeSampleData();