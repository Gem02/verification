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

const sendVerificationEmail = async (email, name, token) => {
    try {
    const info = await transporter.sendMail({
        from: 'noreply',
        to: email,
        subject: 'Verify your email on Goka',
        html: `<div>
                    <h1> Hello ${name} Welcome to Goka </h1>
                    <h4>Your email verification code on Goka is: </h4>
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