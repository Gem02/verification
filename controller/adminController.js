const UserModel = require('../models/User');
const TransactionModel = require('../models/transactions');

const getAllUsers = async (req, res) => {
  try {
    const users = await UserModel.find().select('-password'); 
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllTransactions = async (req, res) => {
  try {
    const transactions = await TransactionModel.find().sort({ createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllUsers,
  getAllTransactions
};
