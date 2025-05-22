const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, 
    auth: {
        user: process.env.MYGMAIL,
        pass: process.env.MYPASSWORD 
    },
    tls: {
        rejectUnauthorized: false,
    },
});

const sendVerificationEmail = async (email, token) => {
    try {
    const info = await transporter.sendMail({
        from: 'noreply',
        to: email,
        subject: 'AY CREATIVE - Reset password ',
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 10px; padding: 20px;">
    <div style="text-align: center;">
      <img src="https://yourdomain.com/logo.png" alt="Goka Logo" style="width: 120px; margin-bottom: 20px;" />
    </div>
    <h2 style="color: #333;">Hello,</h2>
    <p style="font-size: 20px; color: #555;">
      Welcome to <strong>AY-CREATIVE TECHNOLOGY</strong>!
    </p>
    <p style="font-size: 16px; color: #555;">To change your password, please use the verification code below:</p>
    <div style="text-align: center; margin: 30px 0;">
      <span style="font-size: 24px; font-weight: bold; color: #007bff;">${token}</span>
    </div>
    <p style="font-size: 14px; color: #888;">This code will expire in 5 minutes.</p>
    <hr style="margin: 30px 0;" />
    <p style="font-size: 12px; color: #aaa; text-align: center;">
      If you didn’t request this, please ignore this email.
    </p>
  </div>`

    });
    console.log('Verification code sent successfully');
    } catch (error) {
      
        console.log('error sending email');

    }

};

const sendWelcomEmail = async (email, name) => {
    const data = await transporter.sendMail({
        from: 'noreply',
        to: email,
        subject: 'Welcome to Goka services',
        html: `<div>
                    <h1> Hello ${name} Welcome to Goka Services</h1>
                    <p>We gladly welcome you to Goka Services and you
                    wish you great experience .</p>
                </div>`
    });
    console.log(`welcome email sent: ${data}`);
};

const sendVerificationPassword = async (email, token) => {
    try {
    const info = await transporter.sendMail({
        from: 'noreply',
        to: email,
        subject: 'Forgot password on Goka',
        html: `<div>
                    <h1> Forgot password email verification </h1>
                    <h4>Your email verification code to change password on Goka is: </h4>
                    <h2>${token}</h2>
                    <p>This code will expires in 5 mins</p>
                </div>`

    });
    console.log('Verification code sent successfully');
    } catch (error) {
       // return 'error sending email';
        console.log('error sending email');

    }

};
module.exports = { sendVerificationEmail, sendWelcomEmail, sendVerificationPassword };