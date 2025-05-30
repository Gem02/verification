const Transaction = require('../models/transactions');

const saveTransaction = async ({ user, accountNumber, amount, transactionReference, type, status = 'success', description = 'Wallet transaction',
}) => {
  try {
    const newTransaction = new Transaction({
      user,
      accountNumber,
      amount,
      transactionReference,
      type,
      status,
      description,
    });

    await newTransaction.save();
    console.log('✅ Transaction saved successfully.');
  } catch (error) {
    console.error('❌ Error saving transaction:', error.message);
    throw new Error('Transaction logging failed.');
  }
};

module.exports = saveTransaction;
