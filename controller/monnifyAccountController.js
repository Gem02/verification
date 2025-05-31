const { createUserVirtualAccount } = require('../utilities/virtualAccount');
const UserModel = require('../models/User');
const VirtualAccount = require('../models/VirtualAccountModel');
const bcryptjs = require('bcryptjs');

const createAccount = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await UserModel.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.hasAccount) {
      return res.status(400).json({ message: 'User already has a virtual account' });
    }
    const { password, ...safeUser } = user;

    const result = await createUserVirtualAccount(safeUser);

    if (!result || !result.accountReference) {
      return res.status(500).json({ message: 'Failed to create virtual account' });
    }
    
    const virtualAccount = new VirtualAccount({
      user: user._id,
      accountReference: result.accountReference,
      accountName: result.accountName,
      accountNumber: result.accountNumber,
      bankName: result.bankName,
      currencyCode: result.currencyCode,
      contractCode: result.contractCode,
      customerEmail: result.customerEmail,
      customerName: result.customerName,
    });

    await virtualAccount.save();
    await UserModel.findByIdAndUpdate(user._id, { hasAccount: true });

    return res.status(201).json({
      message: 'Virtual account created successfully',
      virtualAccount: {
        bankName: result.bankName,
        accountName: result.accountName,
        accountNumber: result.accountNumber,
        accountReference: result.accountReference,
      },
    });

  } catch (error) {
    console.error('Error creating virtual account:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


const getUserVirtualAccount = async (req, res) => {
  try {
    const userId = req.params.userId;

    const account = await VirtualAccount.findOne({ user: userId });

    if (!account) {
      return res.status(404).json({ message: 'Virtual account not found' });
    }

    res.status(200).json(account);
  } catch (error) {
    console.error('Error fetching virtual account info:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const setPin = async (req, res) => {
  try {
    const { userId, pin } = req.body;

   
    if (!pin || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ message: 'PIN must be a 4-digit number.' });
    }

    const userAccount = await VirtualAccount.findOne({ user: userId });
    if (!userAccount) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    if (userAccount.customerPin) {
      return res.status(400).json({ message: 'PIN already set. Please use update route instead.' });
    }

    const hashedPin = await bcryptjs.hash(pin, 10);
    userAccount.customerPin = hashedPin;
    await userAccount.save();

    return res.status(200).json({ message: 'Transaction PIN set successfully.' });
  } catch (error) {
    console.error('Error setting PIN:', error);
    return res.status(500).json({ message: 'Server error while setting PIN.' });
  }
};

const checkPin = async (req, res) => {
  try {
    const { userId, pin } = req.body;

    if (!userId || !pin) {
      return res.status(400).json({ message: 'User ID and PIN are required.' });
    }

    const account = await VirtualAccount.findOne({ user: userId });

    if (!account) {
      return res.status(404).json({ message: 'Virtual account not found.' });
    }

    if (!account.customerPin) {
      return res.status(400).json({ message: 'PIN not set for this account.' });
    }

    const isMatch = await bcryptjs.compare(pin, account.customerPin);

    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect PIN.' });
    }

    return res.status(200).json({ message: 'PIN verified successfully.' });

  } catch (error) {
    console.error('Error checking PIN:', error.message);
    return res.status(500).json({ message: 'Server error while checking PIN.' });
  }
};


module.exports = { createAccount, getUserVirtualAccount, setPin, checkPin };
