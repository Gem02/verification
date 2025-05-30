const Transaction = require('../models/transactions');

const getTransactionHistory = async (req, res) => {
  const { userId } = req.params; 

  try {
    const transactions = await Transaction.find({ user: userId }).sort({ createdAt: -1 });

    if (!transactions || transactions.length === 0) {
      return res.status(404).json({ message: 'No transaction history found.' });
    }

    return res.status(200).json({
      message: ' Transaction history retrieved successfully.',
      count: transactions.length,
      transactions,
    });

  } catch (error) {
    return res.status(500).json({ message: 'Server error while retrieving transactions.' });
  }
};

module.exports = { getTransactionHistory };
