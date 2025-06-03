require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const validator = require('validator');
const { balanceCheck } = require('../utilities/compareBalance');
const saveTransaction = require('../utilities/saveTransaction');


const NETWORK_CODES = {
  '1': 'MTN',
  '2': 'AIRTEL',
  '3': 'GLO',
  '4': '9MOBILE'
};

const generateTransactionRef = () => 'AIRTIME-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

const buyAirtime = async (req, res) => {
  const { network, phone, plan_type, amount, userId, pin } = req.body;
  console.log("Airtime Request:", req.body);

  try {
   
    const cleanPhone = validator.escape(phone || '');
    if (!cleanPhone || !validator.isMobilePhone(cleanPhone, 'en-NG')) {
      return res.status(400).json({ message: 'Please provide a valid phone number.' });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: 'Invalid amount.' });
    }

    if (!NETWORK_CODES[network]) {
      return res.status(400).json({
        message: 'Invalid network'
      });
    }

    if (!['VTU', 'SHARE'].includes(plan_type?.toUpperCase())) {
      return res.status(400).json({ message: 'Invalid plan type. Use "VTU" or "SHARE"' });
    }


    const userAcc = await balanceCheck(userId, amount, pin);
    console.log("User balance:", userAcc);

    const token = process.env.BIBLALSUB_TOKEN;
    const url = process.env.BIBLALSUB_BASE_URL
    const requestId = `Airtime_${crypto.randomBytes(6).toString('hex')}`;

    const payload = {
      network: parseInt(network),
      phone: cleanPhone,
      plan_type: plan_type.toUpperCase(),
      amount,
      bypass: false,
      "request-id": requestId
    };

    const response = await axios.post(
      `${url}/api/topup/`,
      payload,
      {
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = response.data;

    if (!result?.status || result.status !== 'success') {
      userAcc.balance += numericAmount;
      await userAcc.save();
      return res.status(400).json({ message: 'Airtime purchase failed. Funds refunded.' });
    }

    try {
    await saveTransaction({
      user: userId,
      accountNumber: userAcc.accountNumber,
      amount,
      transactionReference: generateTransactionRef(),
      TransactionType: 'Airtime-Purchase',
      type: 'debit',
      description: result.message || `Airtime purchase: ${NETWORK_CODES[network]} ${plan_type} - ${cleanPhone}`,
    });
    } catch (error) {
      return res.status(400).json({ message: 'Error saving transaction.' });
    }

    return res.status(200).json({
      message: 'Airtime purchased successfully',
      data: result,
      balance: userAcc.balance
    });

  } catch (error) {
    console.error('Airtime Error:', error.response?.data || error.message);

    if (error.response) {
      return res.status(error.response.status).json({
        message: error.response.data?.message || 'Error processing airtime purchase',
        error: error.response.data
      });
    }

    return res.status(500).json({ message: 'Server error during airtime purchase' });
  }
};

module.exports = { buyAirtime };
