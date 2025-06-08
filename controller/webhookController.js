const crypto = require('crypto');
const VirtualAccount = require('../models/VirtualAccountModel');
const {Transaction} = require('../models/transactions');

const MONNIFY_SECRET = process.env.MONNIFY_SECRET_KEY;

const handleWebhook = async (req, res) => {
  try {
    const data = req.body;

    console.log("🔔 Monnify Webhook Received:", JSON.stringify(data, null, 2));

    if (!data || data.eventType !== 'SUCCESSFUL_TRANSACTION') {
      return res.status(200).send('Ignored event');
    }

 
    const signature = req.headers['monnify-signature'];
    const rawBody = JSON.stringify(req.body);
    const computedHash = crypto.createHmac('sha512', MONNIFY_SECRET)
                               .update(rawBody)
                               .digest('hex');

    if (signature !== computedHash) {
      console.warn('❌ Webhook signature mismatch!');
      return res.status(200).send('Invalid signature');
    }

    const event = data.eventData || {};
    const transactionReference = event.transactionReference;
    const amountPaid = event.amountPaid;
    const paymentDescription = event.paymentDescription || 'Deposit to virtual account';
    const accountNumber = event.destinationAccountInformation?.accountNumber;

    if (!transactionReference || !accountNumber || !amountPaid) {
      console.warn('⚠️ Missing required transaction data');
      return res.status(200).send('Invalid data');
    }

   
    const existing = await Transaction.findOne({ transactionReference });
    if (existing) {
      return res.status(200).send('Already processed');
    }


    const virtualAccount = await VirtualAccount.findOne({ accountNumber });
    if (!virtualAccount) {
      console.warn('⚠️ Virtual account not found for:', accountNumber);
      return res.status(200).send('Account not found');
    }

    virtualAccount.balance += parseFloat(amountPaid);
    await virtualAccount.save();

    await Transaction.create({
      user: virtualAccount.user,
      accountNumber,
      amount: parseFloat(amountPaid),
      transactionReference,
      TransactionType: 'Wallet topUp',
      type: 'credit',
      status: 'success',
      description: paymentDescription,
    });

    console.log(`✅ Transaction recorded: ${transactionReference}`);
    return res.status(200).send('Webhook processed successfully');
  } catch (err) {
    console.error('❌ Webhook error:', err);
    return res.status(200).send('Server error');
  }
};

module.exports = { handleWebhook };
