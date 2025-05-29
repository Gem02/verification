const VirtualAccount = require('../models/VirtualAccountModel');

const balanceCheck = async (userId, amount) => {
  const userAcc = await VirtualAccount.findOne({ user: userId });
  if (!userAcc) {
    throw new Error('Account not found.');
  }

  if (userAcc.balance < amount) {
    throw new Error('Insufficient wallet balance.');
  }

  userAcc.balance -= amount;
  await userAcc.save();
  return userAcc;
};

module.exports = {balanceCheck};