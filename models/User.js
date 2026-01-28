const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  userType: {
    type: String,
    enum: ['user', 'mechanic'],
    required: true
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  deviceId: String,
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create compound unique index for email + userType
userSchema.index({ email: 1, userType: 1 }, { unique: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);