const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendMechanicNotification = async (mechanicEmail, mechanicName, requestDetails) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: mechanicEmail,
    subject: '🔧 New Service Request - Smart Road Assistance',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">🚗 New Service Request</h2>
        <p>Hello ${mechanicName},</p>
        <p>You have received a new service request:</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333;">Request Details:</h3>
          <p><strong>Service Type:</strong> ${requestDetails.serviceType}</p>
          <p><strong>Customer:</strong> ${requestDetails.customerName}</p>
          <p><strong>Location:</strong> ${requestDetails.location || 'Location not specified'}</p>
          <p><strong>Description:</strong> ${requestDetails.description || 'No description provided'}</p>
          <p><strong>Estimated Cost:</strong> ₹${requestDetails.estimatedCost}</p>
        </div>
        
        <p>Please log in to your dashboard to accept or decline this request.</p>
        <p><a href="http://localhost:${process.env.PORT}/mechanic-dashboard" style="background: #4ecdc4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Dashboard</a></p>
        
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">Smart Road Assistance - Connecting you with customers</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${mechanicEmail}`);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
};

module.exports = { sendMechanicNotification };