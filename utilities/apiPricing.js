const Pricing = require("../models/PricingModel");
const VirtualAccount = require("../models/VirtualAccountModel");
const { saveTransaction } = require("./saveTransaction");

//  Get pricing for a service
const getServicePricing = async (serviceName) => {
  try {
    const pricing = await Pricing.findOne({ serviceName, isActive: true });

    if (!pricing || !pricing.pricing) {
      throw new Error(`Pricing not found or incomplete for service: ${serviceName}`);
    }

    return pricing;
  } catch (error) {
    throw new Error("Error fetching pricing: " + error.message);
  }
};

//  Calculate billing and attach it to request object
const calculateBilling = async (serviceName, req) => {
  try {
    const pricing = await getServicePricing(serviceName);

    const { costPrice, sellingPrice, currency } = pricing.pricing;

    if (
      typeof costPrice !== "number" ||
      typeof sellingPrice !== "number" ||
      costPrice < 0 ||
      sellingPrice <= 0
    ) {
      throw new Error(`Invalid pricing values for service: ${serviceName}`);
    }

    req.billing = {
      costPrice,
      sellingPrice,
      profit: sellingPrice - costPrice,
      currency: currency || "NGN",
    };

    return req.billing;
  } catch (error) {
    throw new Error("Billing error: " + error.message);
  }
};

//  Check if user's virtual account has enough funds
const checkAPIBalance = async (userId, amount) => {
  try {
    const account = await VirtualAccount.findOne({ user: userId });

    if (!account) {
      throw new Error("Virtual account not found");
    }

    if (account.balance < amount) {
      throw new Error("Insufficient balance");
    }

    return account;
  } catch (error) {
    throw new Error("Balance check error: " + error.message);
  }
};

//  Deduct balance and log the transaction
const deductAPIBalance = async (userId, amount, description) => {
  try {
    const account = await VirtualAccount.findOne({ user: userId });

    if (!account) {
      throw new Error("Virtual account not found");
    }

    if (account.balance < amount) {
      throw new Error("Insufficient balance at deduction stage");
    }

    account.balance -= amount;
    await account.save();

    // Save transaction
    await saveTransaction({
      user: userId,
      accountNumber: account.accountNumber,
      amount,
      transactionReference: `API-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      TransactionType: "API-Usage",
      type: "debit",
      description,
    });

    return account.balance;
  } catch (error) {
    throw new Error("Deduction error: " + error.message);
  }
};

module.exports = {
  getServicePricing,
  calculateBilling,
  checkAPIBalance,
  deductAPIBalance,
};
