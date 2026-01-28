const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  mechanicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  shopName: {
    type: String,
    required: true
  },
  services: [{
    type: String,
    required: true
  }],
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  address: {
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
  ratings: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  averageRating: {
    type: Number,
    default: 0
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  workingHours: {
    open: String,
    close: String
  },
  isOnline: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Create geospatial index
shopSchema.index({ location: '2dsphere' });

shopSchema.methods.updateAverageRating = function() {
  if (this.ratings.length === 0) {
    this.averageRating = 0;
    this.totalRatings = 0;
  } else {
    const sum = this.ratings.reduce((acc, rating) => acc + rating.rating, 0);
    this.averageRating = (sum / this.ratings.length).toFixed(1);
    this.totalRatings = this.ratings.length;
  }
};

module.exports = mongoose.model('Shop', shopSchema);