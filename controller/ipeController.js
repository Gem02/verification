require('dotenv').config();
const axios = require('axios');
const validator = require('validator');
const { balanceCheck } = require('../utilities/compareBalance');
const saveTransaction = require('../utilities/saveTransaction');

const generateTransactionRef = () => 'IPE-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

const verifyIPE = async (req, res) => {
  const { trackingId, userId, pin, amount } = req.body;
  console.log("IPE Verification Request:", req.body);

  try {
    const cleanTrackingId = (trackingId || '').trim();
    if (!validator.isAlphanumeric(cleanTrackingId) || cleanTrackingId.length < 6) {
    return res.status(400).json({ message: 'Invalid Tracking ID.' });
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
      trackingID: cleanTrackingId
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

    console.log(result)
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
