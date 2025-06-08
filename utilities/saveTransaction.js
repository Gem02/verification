const Transaction = require('../models/transactions');
const DataHistory = require('../models/dataHistoryModel');

const saveTransaction = async ({
  user,
  accountNumber,
  amount,
  transactionReference,
  TransactionType,
  type,
  status = 'success',
  description
}) => {
  try {
    const newTransaction = new Transaction({
      user,
      accountNumber,
      amount,
      transactionReference,
      TransactionType,
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

const saveDataHistory = async ({
  data,
  dataFor,
  verifyWith,
  slipLayout,
  userId,
}) => {
  try {
    const record = new DataHistory({
      data,
      dataFor,
      verifyWith,
      slipLayout,
      userId,
    });

    await record.save();
    console.log('✅ DATA verification saved successfully.');
  } catch (error) {
    console.error('❌ Error saving DATA verification:', error.message);
    throw new Error('DATA logging failed.');
  }
};

module.exports = {
  saveTransaction,
  saveDataHistory,
};
