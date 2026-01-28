const mongoose = require('mongoose');
require('dotenv').config();

const Shop = require('./models/Shop');
const User = require('./models/User');

async function cleanupShops() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find shops with incomplete data (no shopName or empty services)
    const incompleteShops = await Shop.find({
      $or: [
        { shopName: { $exists: false } },
        { shopName: '' },
        { services: { $size: 0 } },
        { services: { $exists: false } }
      ]
    });

    console.log(`Found ${incompleteShops.length} incomplete shops`);

    // Delete incomplete shops
    if (incompleteShops.length > 0) {
      const shopIds = incompleteShops.map(shop => shop._id);
      await Shop.deleteMany({ _id: { $in: shopIds } });
      console.log(`Deleted ${incompleteShops.length} incomplete shops`);
    }

    // Find mechanics without shops
    const mechanicsWithoutShops = await User.aggregate([
      { $match: { userType: 'mechanic' } },
      {
        $lookup: {
          from: 'shops',
          localField: '_id',
          foreignField: 'mechanicId',
          as: 'shop'
        }
      },
      { $match: { shop: { $size: 0 } } }
    ]);

    console.log(`Found ${mechanicsWithoutShops.length} mechanics without shops`);
    mechanicsWithoutShops.forEach(mechanic => {
      console.log(`- ${mechanic.name} (${mechanic.email})`);
    });

    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
  }
}

cleanupShops();