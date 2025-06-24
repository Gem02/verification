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
    if (!userAcc) {
      return res.status(403).json({ message: 'User balance or PIN invalid.' });
    }

    const apiKey = process.env.DATA_VERIFY_KEY;
    const payload = { api_key: apiKey, trackingID: cleanTrackingId };
    const transactionReference = generateTransactionRef();

    // Step 1: Submit tracking ID
   /*  const { data: initialRes } = await axios.post(
      `https://dataverify.com.ng/api/developers/ipe`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (!initialRes || initialRes.response !== '00') {
      console.error('IPE Verification Error stage 1:', initialRes);
      return res.status(400).json({ message: 'Error Submitting IPE.' });
    } */

    // Step 2: Get Final Result
    const response = await axios.post(
      `https://dataverify.com.ng/api/developers/ipe_status.php`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );

    const finalRes = response.data;
    if (!finalRes || finalRes.response_code !== '00') {
      console.error('the error is', finalRes);
      return res.status(400).json({ message: 'IPE verification failed at final stage.' });
    }

    // ✅ Debit user
    userAcc.balance -= amount;
    await userAcc.save();

    // 📝 Save data & transaction
    await saveDataHistory({
      data: finalRes,
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
      description: `Verified IPE ${cleanTrackingId}`,
    });
    console.error('IPE Verification Error:', finalRes);
    return res.status(200).json({
      message: 'IPE verified successfully',
      data: finalRes,
      balance: userAcc.balance,
    });

  } catch (error) {
    console.error('IPE Verification Error:', error.response?.data || error.message);
    return res.status(500).json({
      message: error.message || 'Server error during IPE verification',
    });
  }
};


module.exports = { verifyIPE };
