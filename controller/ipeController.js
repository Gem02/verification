// this file is in the controller/ipeController

require('dotenv').config();
const axios = require('axios');
const validator = require('validator');
const { balanceCheck } = require('../utilities/compareBalance');
const {saveTransaction, saveDataHistory} = require('../utilities/saveTransaction');

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

    const response = await axios.post(`https://dataverify.com.ng/api/developers/ipe`, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });



    const result = response.data;
    console.log('the result is:', result);
    if (!result || typeof result !== 'object') {
      return res.status(400).json({ message: 'Server Error. Funds refunded.' });
    }

    if( result.response_code == '00'){
        userAcc.balance -= amount;
        await userAcc.save();
    }
  
    await saveDataHistory({
      data: result,
      dataFor: 'IPE-Slip',
      userId,
    });
 
    await saveTransaction({
      user: userId,
      accountNumber: userAcc.accountNumber,
      amount,
      transactionReference,
      TransactionType: 'IPE-Verification',
      type: 'debit',
      description: `Verified IPE ${cleanTrackingId}`
    });

    console.log(result)
    return res.status(200).json({
      message: 'IPE verified successfully',
      data: result,
      balance: userAcc.balance
    });

  } catch (error) {
    console.error('IPE Verification Error:', error.response?.data || error.message);

    return res.status(500).json({ message:  error.message || 'Server error during IPE verification'});
  }
};

module.exports = { verifyIPE };
