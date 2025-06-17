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

const updateUser = async (req, res) => {
  try {
    const { name, email, phoneNumber } = req.body;

    const allowedUpdates = {};
    if (name) allowedUpdates.name = name;
    if (email) allowedUpdates.email = email;
    if (phoneNumber) allowedUpdates.phoneNumber = phoneNumber;

    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({ message: 'No valid fields provided for update.' });
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      id,
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};



module.exports = {
  getAllUsers,
  getAllTransactions,
  updateUser
};
