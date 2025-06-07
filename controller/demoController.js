require('dotenv').config();
const axios = require('axios');
const validator = require('validator');
const { balanceCheck } = require('../utilities/compareBalance');
const saveTransaction = require('../utilities/saveTransaction');

const generateTransactionRef = () => 'DMO-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

const demographic = async (req, res) => {
  const { firstName, lastName, dob, gender, amount, userId, pin } = req.body;


  if (!firstName || !lastName || !dob || !gender) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ message: 'Invalid amount.' });
  }

  try {
    const userAcc = await balanceCheck(userId, amount, pin);

    const key = process.env.DATA_VERIFY_KEY;
    const transactionReference = generateTransactionRef();


    const payload = {
      api_key: key,
      firstname: validator.escape(firstName),
      lastname: validator.escape(lastName),
      dob: validator.escape(dob), // Expected format: dd-mm-yy
      gender: validator.escape(gender),
    };

    const apiUrl = 'https://dataverify.com.ng/developers/nin_slips/nin_premium_demo';

    const response = await axios.post(apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': JSON.stringify(payload).length
      }
    });

    console.log('API response:', response.data);

    if (response.status !== 200) {
      return res.status(response.status).json({
        message: 'Request failed',
        data: response.data
      });
    }

    // Debit user
    userAcc.balance -= amount;
    await userAcc.save();

    // Record transaction
    await saveTransaction({
      user: userId,
      accountNumber: userAcc.accountNumber,
      amount,
      transactionReference,
      TransactionType: 'Demographic-Demo',
      type: 'debit',
      description: `Demographic Search for ${firstName} ${lastName}`,
    });

    return res.status(200).json({
      message: 'Success',
      data: response.data,
    });

  } catch (error) {
    console.error('Error fetching NIN standard slip:', error.message);
    return res.status(500).json({
      message: error.response?.data || error.message || 'Server error'
    });
  }
};

module.exports = { demographic };
