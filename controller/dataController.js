require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const validator = require('validator');
const { balanceCheck } = require('../utilities/compareBalance');
const saveTransaction = require('../utilities/saveTransaction');
const generateToken = require('./authController');

// Network code mapping
const NETWORK_CODES = {
  '1': 'MTN',
  '2': 'AIRTEL',
  '3': 'GLO',
  '4': '9MOBILE'
};

const generateTransactionRef = () => 'DATA-' + Date.now() + '-' + Math.floor(Math.random() * 1000);


const buyData = async (req, res) => {
  const { network, phone, dataPlan, userId, amount, pin } = req.body;
  console.log("Request data:", req.body);

  try {

    const cleanPhone = validator.escape(phone || '');
    if (!cleanPhone || !validator.isMobilePhone(phone, 'en-NG')) {
        return res.status(400).json({ message: 'Invalid phone number.' });
    }
    if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: 'Invalid amount.' });
    }


    const userAcc = await balanceCheck(userId, amount, pin);
    console.log("Balance data:", userAcc);

    const token = await generateToken();
    const requestId = `DATA_${crypto.randomBytes(6).toString('hex')}`;

    // ✅ Prepare payload for external data vendor API
    const payload = {
      network: parseInt(network),
      phone: cleanPhone,
      data_plan: parseInt(dataPlan),
      bypass: false,
      "request-id": requestId
    };

    // ✅ Make external API request
    const response = await axios.post(
      'https://bilalsadasub.com/api/data',
      payload,
      {
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = response.data;

    // ❌ Handle failure from vendor
    if (!result?.status || result.status !== 'success') {
      userAcc.balance += numericAmount;
      await userAcc.save();
      return res.status(400).json({ message: 'Data purchase failed. Funds have been refunded.' });
    }

    // ✅ Save transaction securely
    try {
      await saveTransaction({
        user: userId,
        accountNumber: userAcc.accountNumber,
        amount: numericAmount,
        transactionReference: generateTransactionRef(),
        TransactionType: 'Data-Purchase',
        type: 'debit',
        description: `Data purchase for ${NETWORK_CODES[network]} - ${result.dataplan}`,
        metadata: {
          network: NETWORK_CODES[network],
          phone: cleanPhone,
          dataPlan: result.dataplan,
          apiReference: requestId
        }
      });
    } catch (logErr) {
      console.error('Transaction logging failed:', logErr);
      // Optional: Notify admin or log into a backup table
    }

    // ✅ Success response
    return res.status(200).json({
      message: 'Data purchased successfully',
      data: result,
      balance: userAcc.balance
    });

  } catch (error) {
    console.error('Data purchase error:', error.response?.data || error.message);

    // External API errors
    if (error.response) {
      return res.status(error.response.status).json({ 
        message: error.response.data?.message || 'Error processing data purchase',
        error: error.response.data
      });
    }

    // Fallback for all other errors
    return res.status(500).json({ 
      message: error.message || 'Server error during data purchase' 
    });
  }
};

module.exports = { buyData };
