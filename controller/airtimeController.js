require('dotenv').config();
const axios = require('axios');
const validator = require('validator');
const { balanceCheck } = require('../utilities/compareBalance');
const saveTransaction = require('../utilities/saveTransaction');

const generateTransactionRef = () => 'TXN-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

const purchaseAirtime = async (req, res) => {
  const { userId, phone, amount, serviceID } = req.body;

  try {
    
    if (!phone || !validator.isMobilePhone(phone, 'en-NG')) {
      return res.status(400).json({ message: 'Invalid phone number.' });
    }
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount.' });
    }
    if (!serviceID) {
      return res.status(400).json({ message: 'Service ID is required.' });
    }

    const userAcc = await balanceCheck(userId, amount);

    const request_id = generateTransactionRef();

    const vtpassResponse = await axios.post(
      `${process.env.VT_PASS_API_BASE_URL}/pay`,
      {
        request_id,
        serviceID,
        amount,
        phone,
      },
      {
        auth: {
          username: process.env.VT_PASS_USERNAME,
          password: process.env.VT_PASS_PASSWORD,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const { data } = vtpassResponse;

    if (data.code !== '000') {
      
      userAcc.balance += amount;
      await userAcc.save();
      return res.status(400).json({ message: 'Airtime purchase failed.', details: data });
    }


    await saveTransaction({
      user: userId,
      accountNumber: userAcc.accountNumber,
      amount,
      transactionReference: request_id,
      TransactionType: 'Airtime purchase',
      type: 'debit',
      description: `Airtime purchase for ${phone} via ${serviceID}`,
    });

    return res.status(200).json({
      message: 'Airtime purchased successfully.',
      data: data.content,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error during airtime purchase.', error: error.message });
  }
};

module.exports = { purchaseAirtime };
