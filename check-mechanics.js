const mongoose = require('mongoose');
const Shop = require('./models/Shop');
const User = require('./models/User');
require('dotenv').config();

async function checkMechanics() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const totalShops = await Shop.countDocuments();
    const onlineShops = await Shop.countDocuments({ isOnline: true });
    
    console.log(`Total shops: ${totalShops}`);
    console.log(`Online shops: ${onlineShops}`);
    
    if (totalShops > 0) {
      const shops = await Shop.find().populate('mechanicId', 'name email');
      shops.forEach(shop => {
        console.log(`- ${shop.shopName} (${shop.mechanicId?.name || 'Unknown'}) - Services: ${shop.services.join(', ')}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkMechanics();