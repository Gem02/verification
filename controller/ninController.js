require('dotenv').config();
const axios = require('axios');
const validator = require('validator');
const {balanceCheck} = require('../utilities/compareBalance');
const saveTransaction = require('../utilities/saveTransaction');


const generateTransactionRef = () => 'TXN-' + Date.now() + '-' + Math.floor(Math.random() * 1000);


const verifyNin = async (req, res) => {
  const base_url = process.env.PREMBLY_BASE_URL;
  const { nin, amount, userId, verifyWith, slipLayout, pin } = req.body;
  console.log("request data", req.body);

  try {
    const cleanNIN = validator.escape(nin || '');
    if (!cleanNIN || cleanNIN.length !== 11) {
      return res.status(400).json({ message: 'Error: Please provide a valid 11-digit NIN number.' });
    }

    const userAcc = await balanceCheck(userId, amount, pin);

    userAcc.balance -= amount;
    await userAcc.save();

    console.log("balNCE DATA", userAcc);
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
  
      userAcc.balance += amount;
      await userAcc.save();
      return res.status(400).json({ message: ' NIN verification failed.' });
    }

    await saveTransaction({
      user: userId,
      accountNumber: userAcc.accountNumber,
      amount,
      transactionReference: generateTransactionRef(),
      TransactionType: 'NIN-Verification',
      type: 'debit',
      description: 'NIN verification slip payment',
    });


    return res.status(200).json({
      message: ' NIN verified successfully.',
      data: result,
      verifyWith,
      slipLayout,
      balance: userAcc.balance
    });

  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error during NIN verification.' });
  }
};


module.exports = {verifyNin};
