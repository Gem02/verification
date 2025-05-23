const crypto = require('crypto');
const VirtualAccount = require('../models/VirtualAccountModel');
const Transaction = require('../models/transactions');

const MONNIFY_SECRET = process.env.MONNIFY_SECRET_KEY;

const handleWebhook = async (req, res) => {
  try {
    const data = req.body;

    console.log("🔔 Monnify Webhook Received:", JSON.stringify(data, null, 2));

    if (!data || data.eventType !== 'SUCCESSFUL_TRANSACTION') {
      return res.status(200).send('Ignored event');
    }

    // ✅ Verify webhook signature
    const signature = req.headers['monnify-signature'];
    const rawBody = JSON.stringify(req.body);
    const computedHash = crypto.createHmac('sha512', MONNIFY_SECRET)
                               .update(rawBody)
                               .digest('hex');

    if (signature !== computedHash) {
      console.warn('❌ Webhook signature mismatch!');
      return res.status(200).send('Invalid signature'); 
    }

    
    const {
      transactionReference,
      destinationAccountNumber,
      amountPaid,
      paymentDescription
    } = data.eventData || {};

    if (!transactionReference || !destinationAccountNumber) {
      console.warn('⚠️ Missing required transaction data');
      return res.status(200).send('Invalid data');
    }

    // ✅ Avoid duplicate transaction
    const existing = await Transaction.findOne({ transactionReference });
    if (existing) {
      return res.status(200).send('Already processed');
    }

    // ✅ Lookup virtual account
    const virtualAccount = await VirtualAccount.findOne({ accountNumber: destinationAccountNumber });

    if (!virtualAccount) {
      console.warn('⚠️ Virtual account not found for:', destinationAccountNumber);
      return res.status(200).send('Account not found'); // DO NOT RETURN 400
    }

    // ✅ Credit the account
    virtualAccount.balance += parseFloat(amountPaid);
    await virtualAccount.save();

    // ✅ Log transaction
    await Transaction.create({
      user: virtualAccount.user,
      accountNumber: destinationAccountNumber,
      amount: parseFloat(amountPaid),
      transactionReference,
      type: 'credit',
      status: 'success',
      description: paymentDescription || 'Deposit to virtual account',
    });

    console.log(`✅ Transaction recorded: ${transactionReference}`);
    return res.status(200).send('Webhook processed successfully');
  } catch (err) {
    console.error('❌ Webhook error:', err);
    return res.status(200).send('Server error'); 
  }
};

module.exports = { handleWebhook };
