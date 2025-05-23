require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { secureHeaders,limiter,hpp} = require('./middleware/security');

const authRoutes = require('./route/authRoutes');
const virtualAccount = require('./route/accountRoute');
const webhookRoutes = require('./route/webhookRoute');

const app = express();

connectDB();

app.use(cookieParser());
app.use(express.json());
app.use(secureHeaders);
app.use(hpp);
app.use(cors({
  origin: process.env.CORS_WHITELIST.split(','),
  methods: 'GET,POST,PUT,DELETE',
  credentials: true,
}));

app.use(limiter);

//routes
app.use('/api/auth', authRoutes);
app.use('/api/virtualAccount', virtualAccount);
app.use('/api/webhook', express.raw({ type: 'application/json' }), webhookRoutes);


const PORT = process.env.PORT || 8000;
app.listen(PORT, () =>{
    console.log(`server running on port ${PORT}`);
})