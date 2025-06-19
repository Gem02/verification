require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { secureHeaders,limiter,hpp} = require('./middleware/security');
 const {sendVerificationEmail} = require('./utilities/emailTemplate')

const authRoutes = require('./route/authRoutes');
const virtualAccount = require('./route/accountRoute');
const webhookRoutes = require('./route/webhookRoute');
const verifications = require('./route/mainVerificationsRoute');
const transactions = require('./route/transactionRoute');
const vtuPurchase = require('./route/vtuRoute');
const cacRoute = require('./route/cacRoute');
const bvnRoute = require('./route/bvnRoute')
const ninModify = require('./route/ninModificationRoute');
const demo = require('./route/demograpgicModel');
const enroll = require('./route/enrollmentRoute');
const admin = require('./route/adminRoute');

const app = express();

connectDB();

app.use(cookieParser());
app.use(express.json());
app.use(secureHeaders);
app.use(hpp);
app.use(cors({
  origin: process.env.CORS_WHITELIST.split(','),
  methods: 'GET,POST,PUT,DELETE,PATCH',
  credentials: true,
}));

app.use(limiter);

//routes
app.use('/api/auth', authRoutes);
app.use('/api/virtualAccount', virtualAccount);
app.use('/api/webhook', express.raw({ type: 'application/json' }), webhookRoutes);
app.use('/api/verify', verifications);
app.use('/api/transactions', transactions);
app.use('/api/vtu', vtuPurchase);
app.use('/api/cac', cacRoute);
app.use('/api/bvn', bvnRoute);
app.use('/api/modify', ninModify);
app.use('/api/demographic', demo);
app.use('/api/enrollment', enroll);
app.use('/api/admin', admin);

//sendVerificationEmail()

const PORT = process.env.PORT || 8000;
app.listen(PORT, () =>{
    console.log(`server running on port ${PORT}`);
})
