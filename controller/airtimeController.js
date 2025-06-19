// this file is in the controller/airtimeController

require('dotenv').config();
const axios = require('axios');
const validator = require('validator');
const { balanceCheck } = require('../utilities/compareBalance');
const {saveTransaction} = require('../utilities/saveTransaction');

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


     const token = process.env.UNIQUE_TOKEN;
     const url = process.env.UNIQUE_URL;

    const payload = {
      network: mainNetwork,
      amount: Number(amount),
      mobile_number: cleanPhone,
      Ported_number: true,
      airtime_type: plan_type.toUpperCase()
    };
//7c1cab40c20100fa909dfe7fbd896681893fc6f7
//7c1cab40c20100fa909dfe7fbd896681893fc6f7
//979cb606cad762769bb0ba1b8102c883b5b1edfb
//7b021f9ec21726e66c5b3790c6ea3bcb2f8db47f

//1b1064c5d139ecedbaca1f5686dc4f17a0952c73
    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `https://www.husmodata.com/api/topup/`,


      headers: {
        Authorization: `Token 1b1064c5d139ecedbaca1f5686dc4f17a0952c73`,
        'Content-Type': 'application/json'
      },
      data: JSON.stringify(payload)
    };

    const response = await axios(config);
    const result = response.data;

    if (!result?.Status || result.Status !== 'successful') {
      console.log('the result for not being succefull is', result)
      return res.status(400).json({ message: 'Airtime purchase failed. Funds refunded.' });
    }

    userAcc.balance -= amount;
    await userAcc.save();

    await saveTransaction({
      user: userId,
      accountNumber: userAcc.accountNumber,
      amount,
      transactionReference: generateTransactionRef(),
      TransactionType: 'Airtime-Purchase',
      type: 'debit',
      description: result.message || `Airtime purchase: ${NETWORK_CODES[mainNetwork]} ${plan_type} - ${cleanPhone}`,
      phone: cleanPhone
    });
    console.log('everything saved here is the data:', result)
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
