require('dotenv').config();
const axios = require('axios');
const validator = require('validator');
const { balanceCheck } = require('../utilities/compareBalance');
const saveTransaction = require('../utilities/saveTransaction');

const NETWORK_CODES = {
  '1': 'MTN',
  '2': 'GLO',
  '3': '9MOBILE',
  '4': 'AIRTEL'
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

    const mainNetwork = Number(network);
    if (!NETWORK_CODES[mainNetwork]) {
      return res.status(400).json({ message: 'Invalid network' });
    }

    if (!['VTU', 'SHARE'].includes(plan_type?.toUpperCase())) {
      return res.status(400).json({ message: 'Invalid plan type. Use "VTU" or "SHARE"' });
    }


    const userAcc = await balanceCheck(userId, amount, pin);
    console.log("User balance before deduction:", userAcc.balance);


    userAcc.balance -= amount;
    await userAcc.save();

     const token = process.env.UNIQUE_TOKEN;
     const url = process.env.UNIQUE_URL;

    const payload = {
      network: mainNetwork,
      amount: Number(amount),
      mobile_number: cleanPhone,
      Ported_number: true,
      airtime_type: plan_type.toUpperCase()
    };

    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `${url}/topup/`,
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json'
      },
      data: JSON.stringify(payload)
    };

    const response = await axios(config);
    const result = response.data;

    if (!result?.Status || result.Status !== 'successful') {
      console.log('the result for not being succefull is', result)
      userAcc.balance += amount;
      await userAcc.save();
      return res.status(400).json({ message: 'Airtime purchase failed. Funds refunded.' });
    }

    await saveTransaction({
      user: userId,
      accountNumber: userAcc.accountNumber,
      amount,
      transactionReference: generateTransactionRef(),
      TransactionType: 'Airtime-Purchase',
      type: 'debit',
      description: result.message || `Airtime purchase: ${NETWORK_CODES[mainNetwork]} ${plan_type} - ${cleanPhone}`,
    });
    console.log('everything saved here is the data:', response)
    return res.status(200).json({
      message: 'Airtime purchased successfully',
      data: result,
      balance: userAcc.balance
    });

  } catch (error) {
    console.error('Airtime Error:', error.response?.data || error.message);

    return res.status(500).json({
      message: error.message || 'Server error during airtime purchase',
      error: error.response?.data || {}
    });
  }
};

module.exports = { buyAirtime };
