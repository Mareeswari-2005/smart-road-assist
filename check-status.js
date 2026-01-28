const { connectDB } = require('./config/database');
const Shop = require('./models/Shop');
require('dotenv').config();

async function checkStatus() {
  try {
    await connectDB();
    
    const shops = await Shop.find();
    console.log(`Total mechanics: ${shops.length}`);
    console.log(`Online mechanics: ${shops.filter(s => s.isOnline).length}`);
    
    shops.forEach(shop => {
      console.log(`- ${shop.shopName} - Online: ${shop.isOnline}, Services: ${shop.services.join(', ')}, Location: [${shop.location.coordinates.join(', ')}]`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStatus();