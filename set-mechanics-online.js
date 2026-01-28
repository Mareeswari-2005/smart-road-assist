const mongoose = require('mongoose');
const Shop = require('./models/Shop');
require('dotenv').config();

async function setMechanicsOnline() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Get all shops
    const shops = await Shop.find();
    console.log(`Found ${shops.length} shops in database`);
    
    if (shops.length === 0) {
      console.log('No shops found. Please add mechanics first.');
      process.exit(0);
    }
    
    // Set all mechanics online and ensure they have services
    const result = await Shop.updateMany(
      {},
      { 
        $set: { 
          isOnline: true,
          services: { 
            $cond: { 
              if: { $eq: [{ $size: "$services" }, 0] },
              then: ["Towing", "Battery Jump", "Tire Change", "Engine Repair", "Brake Service"],
              else: "$services"
            }
          }
        }
      }
    );
    
    console.log(`Updated ${result.modifiedCount} mechanics to online status`);
    
    // Show updated mechanics
    const updatedShops = await Shop.find().populate('mechanicId', 'name');
    updatedShops.forEach(shop => {
      console.log(`- ${shop.shopName} (${shop.mechanicId?.name || 'Unknown'}) - Online: ${shop.isOnline} - Services: ${shop.services.join(', ')}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

setMechanicsOnline();