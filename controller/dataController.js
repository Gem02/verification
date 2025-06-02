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

    const token = process.env.BIBLALSUB_TOKEN;
    const url = process.env.BIBLALSUB_BASE_URL
    const requestId = `DATA_${crypto.randomBytes(6).toString('hex')}`;

    const payload = {
      network: parseInt(network),
      phone: cleanPhone,
      data_plan: parseInt(dataPlan),
      bypass: false,
      "request-id": requestId
    };

    const response = await axios.post(
      `${url}/api/data`,
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
      return res.status(400).json({ message: 'Data purchase failed. Funds have been refunded.' });
    }

    try {
      await saveTransaction({
        user: userId,
        accountNumber: userAcc.accountNumber,
        amount,
        transactionReference: generateTransactionRef(),
        TransactionType: 'Data-Purchase',
        type: 'debit',
        description: `Data purchase for ${NETWORK_CODES[network]} - ${result.dataplan}`,
        
      });
    } catch (error) {
      console.error('Transaction logging failed:', logErr);
    }


    return res.status(200).json({
      message: 'Data purchased successfully',
      data: result,
      balance: userAcc.balance
    });

  } catch (error) {
    console.error('Data purchase error:', error.response?.data || error.message);
    
    if (error.response) {
      return res.status(error.response.status).json({ 
        message: error.response.data?.message || 'Error processing data purchase',
        error: error.response.data
      });
    }
    return res.status(500).json({ 
      message: error.message || 'Server error during data purchase' 
    });
  }
};

module.exports = { buyData };
