const mongoose = require('mongoose');
require('dotenv').config();

async function fixUserIndex() {
  try {
    // Connect to the user database
    const userConnection = mongoose.createConnection(process.env.MONGODB_URI.replace('/smart-road-assistance', '/smart-road-users'));
    
    await userConnection.asPromise();
    console.log('Connected to user database');
    
    const db = userConnection.db;
    const collection = db.collection('users');
    
    // Drop the old unique index on email
    try {
      await collection.dropIndex('email_1');
      console.log('Dropped old email index');
    } catch (error) {
      console.log('Old email index not found or already dropped');
    }
    
    // Create new compound unique index
    await collection.createIndex({ email: 1, userType: 1 }, { unique: true });
    console.log('Created new compound index on email + userType');
    
    await userConnection.close();
    console.log('Index fix completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing index:', error);
    process.exit(1);
  }
}

fixUserIndex();