// Test email configuration
const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
  try {
    console.log('Testing email with:', process.env.EMAIL_USER);
    
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.verify();
    console.log('✅ Email configuration is working!');
    
    // Send test email
    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to yourself
      subject: 'Test Email - Smart Road Assistance',
      text: 'If you receive this, email is working!'
    });
    
    console.log('✅ Test email sent:', result.messageId);
  } catch (error) {
    console.error('❌ Email error:', error.message);
    if (error.code === 'EAUTH') {
      console.log('🔧 Fix: Use Gmail App Password instead of regular password');
    }
  }
}

testEmail();