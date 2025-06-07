require('dotenv').config();
const axios = require('axios');
const validator = require('validator');
const { balanceCheck } = require('../utilities/compareBalance');
const saveTransaction = require('../utilities/saveTransaction');

const generateTransactionRef = () => 'PER-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

const personalization = async (req, res) => {
  const { verifyWith, slipLayout, trackingId,  amount, userId, pin } = req.body;

  console.log('the request isL', req.body)
  if (!trackingId) {
    return res.status(400).json({ message: 'trackingId is required.' });
  }

  if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount.' });
  }

  const userAcc = await balanceCheck(userId, amount, pin);

  const cleanTrackingId = validator.escape(trackingId || '');
  const key = process.env.DATA_VERIFY_KEY;
  const transactionReference = generateTransactionRef();

  try {
    const apiUrl = 'https://dataverify.com.ng/developers/nin_slips/nin_regular_per.php';

    const payload = {
      api_key: key, 
      trackingID: cleanTrackingId
    };

    const response = await axios.post(apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('the response is', response.data)

    if ( !response.status === 200) {
      return res.status(response.status).json({
        message: 'Request failed',
        data: response.data
      });
    }

     userAcc.balance -= amount;
     await userAcc.save();

     await saveTransaction({
        user: userId,
        accountNumber: userAcc.accountNumber,
        amount,
        transactionReference,
        TransactionType: 'Personalization',
        type: 'debit',
        description: `Personalization ${cleanTrackingId}`
        });

      return res.status(200).json({ message: 'Success', data: response.data, verifyWith, slipLayout, });

  } catch (error) {
        console.error('Error fetching NIN slip:', error);
        return res.status(500).json({
        message: error.response?.data || error.message || 'Server error' })
    }
};

module.exports = { personalization };
