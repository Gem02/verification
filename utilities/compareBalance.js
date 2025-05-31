const VirtualAccount = require('../models/VirtualAccountModel');
const bcryptjs = require('bcryptjs');

const balanceCheck = async (userId, amount, pin) => {
  const userAcc = await VirtualAccount.findOne({ user: userId });

  if (!userAcc) {
    throw new Error('Account not found.');
  }

  if (!userAcc.customerPin) {
    throw new Error('PIN not set for this account.');
  }

  const isMatch = await bcryptjs.compare(pin, userAcc.customerPin);
  
  if (!isMatch) {
    throw new Error('Incorrect PIN.');
  }
  

  if (userAcc.balance < amount) {
    throw new Error('Insufficient wallet balance.');
  }

  userAcc.balance -= amount;
  await userAcc.save();
  return userAcc;
};

module.exports = {balanceCheck};