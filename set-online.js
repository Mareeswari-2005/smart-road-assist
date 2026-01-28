const { connectDB } = require('./config/database');
const Shop = require('./models/Shop');
require('dotenv').config();

async function setMechanicsOnline() {
  try {
    await connectDB();
    console.log('Connected to databases');

    const result = await Shop.updateMany({}, { 
      isOnline: true,
      isVerified: true 
    });
    
    console.log(`Updated ${result.modifiedCount} shops to online status`);
    
    const shops = await Shop.find().populate('mechanicId', 'name');
    console.log('\nCurrent mechanics:');
    shops.forEach(shop => {
      console.log(`- ${shop.shopName} (${shop.mechanicId?.name}) - Online: ${shop.isOnline}, Services: ${shop.services.join(', ')}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

setMechanicsOnline();