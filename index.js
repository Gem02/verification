require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { secureHeaders,limiter,hpp} = require('./middleware/security');
 const {sendVerificationEmail} = require('./utilities/emailTemplate')

const apiRoutes = require("./route/apiRoutes");
const developerRoutes = require("./route/developerRoutes")


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

app.get("/", (req, res) => {
  res.send("<h1>API is working</h1>");
});

app.use(secureHeaders);
app.use(hpp);
app.use(cors({
  origin: ['https://ayverify.com.ng'],
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

app.use("/api/v1", apiRoutes);
app.use("/api/developer", developerRoutes);

app.get("/api/v1/docs", (req, res) => {
  res.json({
    message: "API Documentation",
    version: "1.0.0",
    endpoints: {
      authentication: "Include x-api-key and x-api-secret headers",
      base_url: `${req.protocol}://${req.get("host")}/api/v1`,
      services: {
        nin_verification: "POST /verify/nin",
        bvn_verification: "POST /verify/bvn",
        ipe_verification: "POST /verify/ipe",
        airtime: "POST /vtu/airtime",
        data: "POST /vtu/data",
        demographic: "POST /verify/demographic",
        personalization: "POST /verify/personalization",
      },
    },
  })
})

//sendVerificationEmail()

const PORT = process.env.PORT || 8000;
app.listen(PORT, () =>{
    console.log(`server running on port ${PORT}`);
})
