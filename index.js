require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

const authRoutes = require('./route/authRoutes');

const app = express();

connectDB();

app.use(cookieParser());
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_WHITELIST.split(','),
  methods: 'GET,POST,PUT,DELETE',
  credentials: true,
}));

app.use('/api/auth', authRoutes);


const PORT = process.env.PORT || 8000;
app.listen(PORT, () =>{
    console.log(`server running on port ${PORT}`);
})