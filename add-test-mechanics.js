const { connectDB, mechanicConnection } = require('./config/database');
require('dotenv').config();

const shopSchema = require('./models/Shop').schema;
const Shop = mechanicConnection.model('Shop', shopSchema);

async function addTestMechanics() {
  try {
    await connectDB();
    
    const testMechanics = [
      {
        mechanicId: '507f1f77bcf86cd799439011',
        shopName: 'Quick Fix Auto',
        services: ['Engine Repair', 'Tire Change', 'Battery Jump'],
        phone: '9876543210',
        email: 'quickfix@example.com',
        address: 'Main Street, City Center',
        location: {
          type: 'Point',
          coordinates: [77.5946, 12.9716]
        },
        isOnline: true,
        averageRating: 4.5
      },
      {
        mechanicId: '507f1f77bcf86cd799439012',
        shopName: 'Road Rescue',
        services: ['Towing', 'Engine Repair', 'Brake Repair'],
        phone: '9876543211',
        email: 'roadrescue@example.com',
        address: 'Highway Road, Downtown',
        location: {
          type: 'Point',
          coordinates: [77.6000, 12.9800]
        },
        isOnline: true,
        averageRating: 4.8
      }
    ];
    
    await Shop.deleteMany({});
    await Shop.insertMany(testMechanics);
    
    console.log('Test mechanics added successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addTestMechanics();