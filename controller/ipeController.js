require('dotenv').config();
const axios = require('axios');
const validator = require('validator');
const { balanceCheck } = require('../utilities/compareBalance');
const { saveTransaction, saveDataHistory } = require('../utilities/saveTransaction');

const generateTransactionRef = () => 'IPE-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

const verifyIPE = async (req, res) => {
  const { trackingId, userId, pin, amount } = req.body;
  console.log("🔍 IPE Verification Request Received:", {
    trackingId: trackingId ? `${trackingId.substring(0, 3)}...${trackingId.slice(-3)}` : 'null',
    userId,
    amount,
    pin: pin ? '****' : 'null'
  });

  try {
    // Input Validation
    console.log("🛂 Starting input validation...");
    const cleanTrackingId = (trackingId || '').trim();
    
    if (!validator.isAlphanumeric(cleanTrackingId) || cleanTrackingId.length < 6) {
      console.error(`❌ Invalid Tracking ID: ${cleanTrackingId} (Length: ${cleanTrackingId.length})`);
      return res.status(400).json({ message: 'Invalid Tracking ID.' });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      console.error(`❌ Invalid Amount: ${amount}`);
      return res.status(400).json({ message: 'Invalid amount.' });
    }

    // User Balance Check
    console.log(`💰 Checking balance for user ${userId} with amount ${amount}...`);
    const userAcc = await balanceCheck(userId, amount, pin);
    if (!userAcc) {
      console.error(`❌ Balance/PIN check failed for user ${userId}`);
      return res.status(403).json({ message: 'User balance or PIN invalid.' });
    }
    console.log(`✅ Balance check passed. Current balance: ${userAcc.balance}`);

    const apiKey = process.env.DATA_VERIFY_KEY;
    if (!apiKey) {
      console.error('❌ API Key not configured in environment variables');
      return res.status(500).json({ message: 'Service configuration error.' });
    }

    const payload = { api_key: apiKey, trackingID: cleanTrackingId };
    const transactionReference = generateTransactionRef();
    console.log(`🆔 Generated transaction reference: ${transactionReference}`);

    // Step 1: Submit tracking ID
    console.log(`🚀 Sending IPE verification request for tracking ID: ${cleanTrackingId}`);
    const { data: initialRes } = await axios.post(
      `https://dataverify.com.ng/api/developers/ipe`,
      payload,
      { 
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000 // 10 seconds timeout
      }
    ).catch(err => {
      console.error('🌐 API Request Failed:', {
        url: 'https://dataverify.com.ng/api/developers/ipe',
        error: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      throw new Error('IPE verification service unavailable');
    });

    console.log('📥 Initial API Response:', initialRes);
    
    if (!initialRes || initialRes.response !== '00') {
      console.error('❌ IPE Verification Failed at Stage 1:', {
        trackingId: cleanTrackingId,
        response: initialRes,
        expectedResponse: '00'
      });
      return res.status(400).json({ 
        message: 'Error Submitting IPE.',
        details: initialRes?.message || 'No response from verification service'
      });
    }

    // Step 2: Get Final Result
    console.log('🔄 Checking final verification status...');
    const { data: finalRes } = await axios.post(
      `https://dataverify.com.ng/api/developers/ipe_status.php`,
      payload,
      { 
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000 // 10 seconds timeout
      }
    ).catch(err => {
      console.error('🌐 Final Status API Request Failed:', {
        url: 'https://dataverify.com.ng/api/developers/ipe_status.php',
        error: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      throw new Error('IPE status check service unavailable');
    });

    console.log('📊 Final Verification Response:', finalRes);
    
    if (!finalRes || finalRes.response_code !== '00') {
      console.error('❌ IPE Verification Failed at Final Stage:', {
        trackingId: cleanTrackingId,
        responseCode: finalRes?.response_code,
        expectedResponseCode: '00',
        fullResponse: finalRes
      });
      return res.status(400).json({ 
        message: 'IPE verification failed at final stage.',
        details: finalRes?.message || 'Invalid final response'
      });
    }

    // Debit User
    console.log(`💸 Debiting user ${userId} with amount ${amount}...`);
    userAcc.balance -= amount;
    await userAcc.save();
    console.log(`✅ User debited successfully. New balance: ${userAcc.balance}`);

    // Save Data History
    console.log('📝 Saving data history...');
    await saveDataHistory({
      data: finalRes,
      dataFor: 'IPE-Slip',
      userId,
    }).catch(err => {
      console.error('⚠️ Failed to save data history:', err.message);
      // Continue even if history save fails
    });

    // Save Transaction
    console.log('💾 Saving transaction record...');
    await saveTransaction({
      user: userId,
      accountNumber: userAcc.accountNumber,
      amount,
      transactionReference,
      TransactionType: 'IPE-Verification',
      type: 'debit',
      description: `Verified IPE ${cleanTrackingId}`,
    }).catch(err => {
      console.error('⚠️ Failed to save transaction:', err.message);
      // Continue even if transaction save fails
    });

    console.log('🎉 IPE Verification Completed Successfully');
    return res.status(200).json({
      message: 'IPE verified successfully',
      data: finalRes,
      balance: userAcc.balance,
      transactionReference
    });

  } catch (error) {
    console.error('🔥 Critical Error in IPE Verification:', {
      error: error.stack || error.message,
      requestBody: {
        trackingId: trackingId ? `${trackingId.substring(0, 3)}...${trackingId.slice(-3)}` : 'null',
        userId,
        amount
      },
      timestamp: new Date().toISOString()
    });
    
    return res.status(500).json({
      message: 'Server error during IPE verification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = { verifyIPE };