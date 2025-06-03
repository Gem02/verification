require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const validator = require('validator');
const { balanceCheck } = require('../utilities/compareBalance');
const saveTransaction = require('../utilities/saveTransaction');

const generateTransactionRef = () => 'IPE-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

const verifyBvn = async (req, res) => {
  const { bvn, userId, pin, amount } = req.body;
  console.log("IPE Verification Request:", req.body);

  try {
    const cleanBvn = validator.escape(bvn || '');
    if (!cleanBvn || !validator.isNumeric(cleanBvn) || cleanBvn.length !== 11) {
      return res.status(400).json({ message: 'Invalid BVN. Must be 11 digits.' });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount.' });
    }

    const userAcc = await balanceCheck(userId, amount, pin);
    console.log("Current balance:", userAcc.balance);

    const apiUrl = process.env.DATA_VERIFY_URL;
    const apiKey = process.env.DATA_VERIFY_KEY;
    const transactionReference = generateTransactionRef();

    const payload = {
      api_key: apiKey,
      trackingID: cleanBvn
    };

    const response = await axios.post(`${apiUrl}/ipe`, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = response.data;

    if (!result || typeof result !== 'object') {
     
      userAcc.balance += Number(amount);
      await userAcc.save();

      return res.status(400).json({ message: 'Server Error. Funds refunded.' });
    }

 
    await saveTransaction({
      user: userId,
      accountNumber: userAcc.accountNumber,
      amount,
      transactionReference,
      TransactionType: 'IPE-Verification',
      type: 'debit',
      description: `Verified IPE ${cleanBvn}`
    });

    return res.status(200).json({
      message: 'IPE verified successfully',
      data: result,
      balance: userAcc.balance
    });

  } catch (error) {
    console.error('IPE Verification Error:', error.response?.data || error.message);

    if (error.response) {
      return res.status(error.response.status).json({
        message: error.response.data?.message || 'IPE verification failed',
        error: error.response.data
      });
    }

    return res.status(500).json({ message: 'Server error during BVN verification' });
  }
};

module.exports = { verifyIPE };
