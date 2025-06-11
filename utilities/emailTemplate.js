const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
        user: '8f648f001@smtp-brevo.com',
        pass: 'O3saNTy9Vf62758B'
    }
});

const sendVerificationEmail = async () => {
    try {
        const info = await transporter.sendMail({
            from: '"AY-CREATIVE TECHNOLOGY" <support@ayverify.com.ng>',
            to: 'mangaigodwin@gmail.com',
            subject: 'Your Verification Code',
            text: 'Your AY-CREATIVE verification code is: 7867. This code expires in 5 minutes.',
            html: `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px;">
                    <p>Hi there,</p>
                    <p>Your verification code for AY-CREATIVE is:</p>
                    <h2 style="color: #007bff;">7867</h2>
                    <p>This code will expire in 5 minutes.</p>
                    <p>If you didn’t request this, you can safely ignore it.</p>
                    <hr />
                    <small style="color: #888;">AY-CREATIVE TECHNOLOGY • ayverify.com.ng</small>
                </div>
            `,
            headers: {
                'List-Unsubscribe': '<mailto:support@ayverify.com.ng>'
            }
        });

        console.log('✅ Email sent successfully:', info.messageId);
    } catch (error) {
        console.error('❌ Error sending email:', error);
    }
};

module.exports = { sendVerificationEmail };
