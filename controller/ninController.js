require('dotenv').config();
const VirtualAccount = require('../models/VirtualAccountModel');
const axios = require('axios');
const validator = require('validator');

const verifyNin = async (req, res) => {
  const base_url = process.env.PREMBLY_BASE_URL;

  try {
    const { nin, amount, userId, verifyWith, slipLayout } = req.body;

    const cleanNIN = validator.escape(nin || '');
    if (!cleanNIN || cleanNIN.length !== 11) {
      return res.status(400).json({ message: 'Error: Please provide a valid 11-digit NIN number.' });
    }

    const userAcc = await VirtualAccount.findOne({ user: userId });
    if (!userAcc) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    if (userAcc.balance < amount) {
      return res.status(400).json({ message: 'Insufficient wallet balance.' });
    }

   userAcc.balance -= amount;
   await userAcc.save();

    const response = await axios.post(
      `${base_url}/identitypass/verification/vnin`,
      { number: cleanNIN },
      {
        headers: {
          'x-api-key': process.env.PREMBLY_API_KEY,
          'app-id': process.env.PREMBLY_APP_ID,
          'Content-Type': 'application/json',
        },
      }
    );

    const result = response.data;

    if (!result?.status || result.verification?.status !== 'VERIFIED') {
     
      
      return res.status(400).json({ message: '❌ NIN verification failed.' });
    }

    // All good
    return res.status(200).json({ message: '✅ NIN verified successfully.', data: result, verifyWith, slipLayout });
  } catch (error) {
      userAcc.balance += amount;
      await userAcc.save();
      return res.status(500).json({ message: 'Server error during NIN verification.' });
  }
};

module.exports = {verifyNin};
