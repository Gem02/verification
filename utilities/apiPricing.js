const Pricing = require("../models/PricingModel")

// Get pricing for a service
const getServicePricing = async (serviceName) => {
  try {
    const pricing = await Pricing.findOne({ serviceName, isActive: true })
    if (!pricing) {
      throw new Error(`Pricing not found for service: ${serviceName}`)
    }
    return pricing
  } catch (error) {
    throw error
  }
}

// Calculate profit and set billing info
const calculateBilling = async (serviceName, req) => {
  try {
    const pricing = await getServicePricing(serviceName)

    req.billing = {
      costPrice: pricing.pricing.costPrice,
      sellingPrice: pricing.pricing.sellingPrice,
      profit: pricing.pricing.sellingPrice - pricing.pricing.costPrice,
      currency: pricing.pricing.currency,
    }

    return pricing.pricing.sellingPrice
  } catch (error) {
    throw error
  }
}

// Check if user has sufficient balance (for prepaid model)
const checkAPIBalance = async (userId, amount) => {
  const VirtualAccount = require("../models/VirtualAccountModel")

  try {
    const account = await VirtualAccount.findOne({ user: userId })
    if (!account) {
      throw new Error("Virtual account not found")
    }

    if (account.balance < amount) {
      throw new Error("Insufficient balance")
    }

    return account
  } catch (error) {
    throw error
  }
}

// Deduct balance for API usage
const deductAPIBalance = async (userId, amount, description) => {
  const VirtualAccount = require("../models/VirtualAccountModel")
  const { saveTransaction } = require("./saveTransaction")

  try {
    const account = await VirtualAccount.findOne({ user: userId })
    account.balance -= amount
    await account.save()

    // Save transaction
    await saveTransaction({
      user: userId,
      accountNumber: account.accountNumber,
      amount,
      transactionReference: `API-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      TransactionType: "API-Usage",
      type: "debit",
      description,
    })

    return account.balance
  } catch (error) {
    throw error
  }
}

module.exports = {
  getServicePricing,
  calculateBilling,
  checkAPIBalance,
  deductAPIBalance,
}
