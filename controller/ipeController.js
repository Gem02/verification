require("dotenv").config();
const axios = require("axios");
const validator = require("validator");
const { balanceCheck } = require("../utilities/compareBalance");
const { saveTransaction, saveDataHistory } = require("../utilities/saveTransaction");

const generateTransactionRef = () =>
  "IPE-" + Date.now() + "-" + Math.floor(Math.random() * 1000);

const submitIPE = async (req, res) => {
  const { trackingId, userId, pin, amount } = req.body;

  try {
    const cleanTrackingId = (trackingId || "").trim();

   

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount." });
    }

    const userAcc = await balanceCheck(userId, amount, pin);
    if (!userAcc) {
      return res.status(403).json({ message: "Invalid balance or PIN." });
    }

    const payload = {
      api_key: process.env.DATA_VERIFY_KEY,
      trackingID: cleanTrackingId,
    };

    console.log('the payload to use now is', payload);
    const response = await axios.post(
      "https://dataverify.com.ng/api/developers/ipe",
      payload,
      { headers: { "Content-Type": "application/json" } }
    );

    const result = response.data;
    if (!result || result.response_code !== "00") {
      console.error('error the response code is', result.response_code);
      return res.status(400).json({ message: "Error submitting IPE tracking ID.", details: result });
    }

    // 💰 Deduct and save
    userAcc.balance -= amount;
    await userAcc.save();

    const transactionReference = generateTransactionRef();

    await saveTransaction({
      user: userId,
      accountNumber: userAcc.accountNumber,
      amount,
      transactionReference,
      TransactionType: "IPE-Submit",
      type: "debit",
      description: `Submitted IPE tracking ID ${cleanTrackingId}`,
    });
    console.log('transaction saved');

    return res.status(200).json({
      message: "IPE tracking submitted successfully",
      data: result,
      balance: userAcc.balance,
    });

  } catch (error) {
    console.error("IPE Submit Error:", error.response?.data || error.message);
    return res.status(500).json({ message: "Server error during IPE submission", error: error.message });
  }
};

const checkIPEStatus = async (req, res) => {
  const { trackingId, userId, pin, amount } = req.body;

  try {
    const cleanTrackingId = (trackingId || "").trim();

    if (!validator.isAlphanumeric(cleanTrackingId) || cleanTrackingId.length < 6) {
      return res.status(400).json({ message: "Invalid Tracking ID." });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount." });
    }

    const userAcc = await balanceCheck(userId, amount, pin);
    if (!userAcc) {
      return res.status(403).json({ message: "Invalid balance or PIN." });
    }

    const payload = {
      api_key: process.env.DATA_VERIFY_KEY,
      trackingID: cleanTrackingId,
    };

    console.log('the payload to use now is', payload);

    const response = await axios.post(
      "https://dataverify.com.ng/api/developers/ipe_status.php",
      payload,
      { headers: { "Content-Type": "application/json" } }
    );

    const finalRes = response.data

    if (!finalRes || finalRes.response_code !== "00") {
      console.error('the finalRes is ', finalRes.response_code);
      return res.status(400).json({ message: "Error checking IPE status.", details: finalRes });
    }

    // 💰 Deduct and Save
    userAcc.balance -= amount;
    await userAcc.save();

    const transactionReference = generateTransactionRef();

    await saveDataHistory({
      data: finalRes,
      dataFor: "IPE-Slip",
      userId,
    });

    await saveTransaction({
      user: userId,
      accountNumber: userAcc.accountNumber,
      amount,
      transactionReference,
      TransactionType: "IPE-Status",
      type: "debit",
      description: `Checked IPE status for ${cleanTrackingId}`,
    });
    console.log('reansaction saved')

    return res.status(200).json({
      message: "IPE status checked successfully",
      data: finalRes,
      balance: userAcc.balance,
    });

  } catch (error) {
    console.error("IPE Status Error:", error.response?.data || error.message);
    return res.status(500).json({ message: "Server error during IPE status check", error: error.message });
  }
};

const freeStatus = async (req, res) => {
  const { trackingId } = req.body;

  try {
    const cleanTrackingId = (trackingId || "").trim();

    if (!validator.isAlphanumeric(cleanTrackingId) || cleanTrackingId.length < 6) {
      return res.status(400).json({ message: "Invalid Tracking ID." });
    }

    const payload = {
      api_key: process.env.DATA_VERIFY_KEY,
      trackingID: cleanTrackingId,
    };

    const { data: finalRes } = await axios.post(
      "https://dataverify.com.ng/api/developers/ipe_status.php",
      payload,
      { headers: { "Content-Type": "application/json" } }
    );

    if (!finalRes || finalRes.response_code !== "00") {
      return res.status(400).json({ message: "Error checking IPE status.", details: finalRes });
    }
    await saveDataHistory({
      data: finalRes,
      dataFor: "IPE-Slip",
      userId,
    });

    return res.status(200).json({
      message: "IPE status checked successfully",
      data: finalRes,
      balance: userAcc.balance,
    });

  } catch (error) {
    console.error("IPE Status Error:", error);
    return res.status(500).json({ message: "Server error during IPE status check", error: error.message });
  }
}

module.exports = {
  submitIPE,
  checkIPEStatus,
  freeStatus
};
