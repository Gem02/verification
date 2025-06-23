// this file is in the controller/adminController

const mongoose = require('mongoose');
const TransactionModel = require('../models/transactions');
const BvnLicenseSubmission = require('../models/BvnLicenseModel');
const BvnSubmission = require('../models/BvnSubmissionModel');
const CacRegistration = require('../models/cacRegistrationModel');
const Enrollment = require("../models/EnrollmentModel");
const NinModification = require('../models/NinModificationModel'); 
const UserModel = require('../models/User');
const VirtualAccount = require('../models/VirtualAccountModel');

const getAllUsers = async (req, res) => {
  try {
    const users = await UserModel.find().select('-password');

    const virtualAccounts = await VirtualAccount.find();

    const accountMap = {};
    virtualAccounts.forEach((acc) => {
      if (acc.user) {
        accountMap[acc.user.toString()] = {
          accountName: acc.accountName || null,
          accountNumber: acc.accountNumber || null,
          balance: acc.balance || 0
        };
      }
    });

    const usersWithAccounts = users.map(user => {
      const accountDetails = accountMap[user._id.toString()] || {};
      return {
        ...user.toObject(),
        accountName: accountDetails.accountName || null,
        accountNumber: accountDetails.accountNumber || null,
        balance: accountDetails.balance || 0
      };
    });

    res.json(usersWithAccounts);
  } catch (err) {
    console.error('Error fetching users with accounts:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const addAccountBalance = async (req, res) => {
  try {
    const { phone, userId, amount } = req.body;

    
    if (!phone || !userId || !amount) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const account = await VirtualAccount.findOne({ user: userId });

    if (!account) {
      return res.status(404).json({ message: 'Virtual account not found for this user' });
    }

    // if (account.customerPhone && account.customerPhone !== phone) {
    //   return res.status(403).json({ message: 'Phone number mismatch' });
    // }

    account.balance += Number(amount);
    await account.save();

    return res.status(200).json({
      message: 'Balance updated successfully',
      newBalance: account.balance,
    });
  } catch (error) {
    console.error('Error adding account balance:', error);
    return res.status(500).json({ message: 'Server error updating balance' });
  }
};

const debitAccountBalance = async (req, res) => {
  try {
    const { phone, userId, amount } = req.body;

    
    if (!userId || !amount) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const account = await VirtualAccount.findOne({ user: userId });

    if (!account) {
      return res.status(404).json({ message: 'Virtual account not found for this user' });
    }

    // if (account.customerPhone && account.customerPhone !== phone) {
    //   return res.status(403).json({ message: 'Phone number mismatch' });
    // }

    account.balance -= Number(amount);
    await account.save();

    return res.status(200).json({
      message: 'Balance debited successfully',
      newBalance: account.balance,
    });
  } catch (error) {
    console.error('Error debiting account balance:', error);
    return res.status(500).json({ message: 'Server error updating balance' });
  }
};

const getAllTransactions = async (req, res) => {
  try {
    const transactions = await TransactionModel.find().sort({ createdAt: -1 });
    res.status(200).json(transactions);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllBankAgency = async (req, res) => {
  try {
    const bankAgency = await BvnSubmission.find().sort({ createdAt: -1 });
    res.status(200).json(bankAgency);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

const getAllCacReg = async (req, res) => {
  try {
    const cacReg = await CacRegistration.find().sort({ createdAt: -1 });
    res.status(200).json(cacReg);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

const getAllEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.find().sort({ createdAt: -1 });
    res.status(200).json(enrollment);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

const getAllNinModifications = async (req, res) => {
  try {
    const ninmodify = await NinModification.find().sort({ createdAt: -1 });
    res.status(200).json(ninmodify);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

const getAllBvnLicence = async (req, res) => {
  try {
    const bankLicence = await BvnLicenseSubmission.find().sort({ createdAt: -1 });
    res.status(200).json(bankLicence);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

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

const upgradeUser = async (req, res) => {
  const { userId } = req.body;

  // ✅ Validate input
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: 'Valid userId is required.' });
  }

  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'User is already an admin.' });
    }

    user.role = 'admin';
    await user.save();

    const { password, ...userData } = user.toObject();

    return res.status(200).json({
      message: 'User upgraded to admin successfully.',
      user: userData,
    });

  } catch (error) {
    console.error('Upgrade User Error:', error);
    return res.status(500).json({ message: 'Server error while upgrading user.' });
  }
};

const downgradeUser = async (req, res) => {
  const { userId } = req.body;

  // ✅ Validate input
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: 'Valid userId is required.' });
  }

  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.role === 'user') {
      return res.status(400).json({ message: 'User is already at the lowest role.' });
    }

    user.role = 'user';
    await user.save();

    const { password, ...userData } = user.toObject();

    return res.status(200).json({
      message: 'User downgraded to user successfully.',
      user: userData,
    });

  } catch (error) {
    console.error('Downgrade User Error:', error);
    return res.status(500).json({ message: 'Server error while downgrading user.' });
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
  deleteUser,
  getAllBankAgency,
  getAllBvnLicence,
  getAllCacReg,
  getAllEnrollment,
  getAllNinModifications,
  addAccountBalance,
  debitAccountBalance,
  upgradeUser,
  downgradeUser
};
