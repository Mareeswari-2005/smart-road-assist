require('dotenv').config();

console.log('Environment Variables Check:');
console.log('============================');
console.log('PORT:', process.env.PORT || 'Not set (will use 3000)');
console.log('MONGODB_URI:', process.env.MONGODB_URI || 'Not set');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Not set');
console.log('EMAIL_USER:', process.env.EMAIL_USER || 'Not set');
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'Set' : 'Not set');

// Validate critical variables
const required = ['MONGODB_URI', 'JWT_SECRET'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.log('\n❌ Missing required environment variables:', missing);
} else {
  console.log('\n✅ All required environment variables are set');
}