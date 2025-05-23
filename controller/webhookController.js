const crypto = require('crypto');
const VirtualAccount = require('../models/VirtualAccountModel');
const Transaction = require('../models/transactions');

const MONNIFY_SECRET = process.env.MONNIFY_SECRET_KEY;

const handleWebhook = async (req, res) => {
  try {
    const data = req.body;

    if (!data || data.eventType !== 'SUCCESSFUL_TRANSACTION') {
      return res.status(200).send('Ignored event');
    }

    const signature = req.headers['monnify-signature'];
    const rawBody = JSON.stringify(req.body);
    const computedHash = crypto.createHmac('sha512', MONNIFY_SECRET)
                               .update(rawBody)
                               .digest('hex');

    if (signature !== computedHash) {
      console.warn('Webhook signature mismatch!');
      return res.status(403).send('Invalid signature');
    }

    const { transactionReference, destinationAccountNumber, amountPaid, paymentDescription } = data.eventData;

    const existing = await Transaction.findOne({ transactionReference });
    if (existing) {
      return res.status(200).send('Already processed');
    }

    const virtualAccount = await VirtualAccount.findOne({ accountNumber: destinationAccountNumber });
    if (!virtualAccount) {
      return res.status(400).send('Virtual account not found');
    }

    virtualAccount.balance += parseFloat(amountPaid);
    await virtualAccount.save();

    await Transaction.create({
      user: virtualAccount.user,
      accountNumber: destinationAccountNumber,
      amount: parseFloat(amountPaid),
      transactionReference,
      type: 'credit',
      status: 'success',
      description: paymentDescription || 'Deposit to virtual account',
    });

    return res.status(200).send('Webhook processed successfully');
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).send('Server error');
  }
};

module.exports = { handleWebhook };
