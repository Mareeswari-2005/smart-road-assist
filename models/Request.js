const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mechanicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  serviceType: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  locationAddress: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'emergency'],
    default: 'medium'
  },
  estimatedCost: {
    type: Number,
    default: 0
  },
  actualCost: {
    type: Number,
    default: 0
  },
  estimatedArrival: Date,
  actualArrival: Date,
  completedAt: Date,
  cancelledAt: Date,
  mechanicLocation: {
    lat: Number,
    lng: Number,
    timestamp: Date
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending'
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  review: String,
  ratedAt: Date
}, {
  timestamps: true
});

// Create geospatial index for location-based queries
requestSchema.index({ location: '2dsphere' });
requestSchema.index({ userId: 1, status: 1 });
requestSchema.index({ mechanicId: 1, status: 1 });

module.exports = mongoose.model('Request', requestSchema);