const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected for migration'))
  .catch(err => console.error('MongoDB connection error:', err));

const Request = require('./models/Request');

async function migrateRequests() {
  try {
    console.log('Starting request migration...');
    
    // Find all requests with old location format
    const requests = await Request.find({
      $or: [
        { locationAddress: { $exists: false } },
        { 'location.type': { $exists: false } }
      ]
    });
    
    console.log(`Found ${requests.length} requests to migrate`);
    
    for (const request of requests) {
      let updateData = {};
      
      // Handle location field migration
      if (typeof request.location === 'string') {
        // Old format: string location
        updateData.locationAddress = request.location;
        
        // Try to parse coordinates from string
        if (request.location.includes(',')) {
          const coords = request.location.split(',').map(coord => parseFloat(coord.trim()));
          if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
            updateData.location = {
              type: 'Point',
              coordinates: [coords[1], coords[0]] // [lng, lat]
            };
          } else {
            // Default coordinates if parsing fails
            updateData.location = {
              type: 'Point',
              coordinates: [0, 0]
            };
          }
        } else {
          // Address string - use default coordinates
          updateData.location = {
            type: 'Point',
            coordinates: [0, 0]
          };
        }
      } else if (!request.locationAddress) {
        // Location is already GeoJSON but missing locationAddress
        if (request.location && request.location.coordinates) {
          updateData.locationAddress = `${request.location.coordinates[1]}, ${request.location.coordinates[0]}`;
        } else {
          updateData.locationAddress = 'Unknown location';
          updateData.location = {
            type: 'Point',
            coordinates: [0, 0]
          };
        }
      }
      
      // Update the request
      if (Object.keys(updateData).length > 0) {
        await Request.findByIdAndUpdate(request._id, updateData);
        console.log(`Migrated request ${request._id}`);
      }
    }
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateRequests();