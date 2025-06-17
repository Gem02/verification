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
    const { userId, firstName, lastName, email, phone } = req.body;

    const allowedUpdates = {};
    if (firstName) allowedUpdates.firstName = firstName;
    if (lastName) allowedUpdates.lastName = lastName;
    if (email) allowedUpdates.email = email;
    if (phone) allowedUpdates.phoneNumber = phone;

    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({ message: 'No valid fields provided for update.' });
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({ message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


const deleteUser = async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await UserModel.findByIdAndDelete(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


module.exports = {
  getAllUsers,
  getAllTransactions,
  updateUser,
  deleteUser
};
