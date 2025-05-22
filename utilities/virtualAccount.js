require('dotenv').config();
const {getMonnifyToken} = require('../config/monnifyToken');
const axios = require("axios");

async function createUserVirtualAccount(user) {
  try {
    const token = await getMonnifyToken();

    const response = await axios.post(
      "https://sandbox.monnify.com/api/v1/bank-transfer/reserved-accounts",
      {
        accountReference: `user_${user._id}`, 
        accountName: `${user.firstName} ${user.lastName}`,
        currencyCode: "NGN",
        contractCode: process.env.MONNIFY_CONTRACT_CODE,
        customerEmail: user.email,
        customerName: `${user.firstName} ${user.lastName}`,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("From virtual account", response.data);
    return response.data.responseBody;

  } catch (error) {
    console.error("Error creating virtual account:", error.response?.data || error.message);
    throw new Error("Virtual account creation failed");
  }
}

module.exports = {createUserVirtualAccount}