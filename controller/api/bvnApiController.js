require("dotenv").config();
const axios = require("axios");
const validator = require("validator");
const {
  calculateBilling,
  checkAPIBalance,
  deductAPIBalance,
} = require("../../utilities/apiPricing");

const verifyBvnAPI = async (req, res) => {
  const startTime = Date.now();
  const requestId = `bvn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  let userAccount = null;

  try {
    const { bvn } = req.body;

    if (!bvn) {
      return res.status(400).json({
        success: false,
        message: "BVN is required",
        error: {
          code: "MISSING_REQUIRED_FIELD",
          field: "bvn",
          description: "The BVN field is required and cannot be empty",
        },
        data: null,
        meta: {
          request_id: requestId,
          timestamp: new Date().toISOString(),
          response_time: `${Date.now() - startTime}ms`,
          api_version: "v1.0.0",
        },
      });
    }

    const cleanBVN = validator.escape(bvn.toString().trim());
    if (!validator.isNumeric(cleanBVN) || cleanBVN.length !== 11) {
      return res.status(400).json({
        success: false,
        message: "Invalid BVN format",
        error: {
          code: "INVALID_BVN_FORMAT",
          field: "bvn",
          description: "BVN must be exactly 11 digits",
          provided_length: cleanBVN.length,
          expected_format: "11 numeric digits",
        },
        data: null,
        meta: {
          request_id: requestId,
          timestamp: new Date().toISOString(),
          response_time: `${Date.now() - startTime}ms`,
          api_version: "v1.0.0",
        },
      });
    }

    // Billing and balance check
    let billing;
    try {
      billing = await calculateBilling("bvn", req);
    } catch (err) {
      console.error("Billing error:", err.message);
      throw new Error("Failed to calculate billing");
    }

    try {
      userAccount = await checkAPIBalance(req.apiUser._id, billing.sellingPrice);
    } catch (err) {
      console.error("Balance check error:", err.message);
      throw err;
    }

    // External API call
    let response;
    try {
      const base_url = process.env.PREMBLY_BASE_URL;
      response = await axios.post(
        `${base_url}/identitypass/verification/bvn`,
        { number: cleanBVN },
        {
          headers: {
            "x-api-key": process.env.PREMBLY_API_KEY,
            "app-id": process.env.PREMBLY_APP_ID,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );
    } catch (err) {
      console.error("Prembly BVN API call failed:", err.message, err.response?.data);
      throw err;
    }

    const result = response.data;
    console.log("BVN Verification Result:", result);

    if (!result?.status || result.verification?.status !== "VERIFIED") {
      return res.status(422).json({
        success: false,
        message: "BVN verification failed",
        error: {
          code: "VERIFICATION_FAILED",
          field: "bvn",
          description: "The provided BVN could not be verified with the banking database",
          provider_response: result?.message || result?.verification?.status || "Unknown error",
        },
        data: {
          bvn: cleanBVN,
          verification_status: "FAILED",
          provider_status: result?.verification?.status || "UNKNOWN",
        },
        meta: {
          request_id: requestId,
          timestamp: new Date().toISOString(),
          response_time: `${Date.now() - startTime}ms`,
          api_version: "v1.0.0",
          provider: "Prembly Identity Pass",
        },
      });
    }

    // Deduct balance
    let newBalance;
    try {
      newBalance = await deductAPIBalance(
        req.apiUser._id,
        billing.sellingPrice,
        `API BVN Verification - ${cleanBVN}`
      );
    } catch (err) {
      console.error("Deduction error:", err.message);
      throw err;
    }

    const v = result.verification;

    return res.status(200).json({
      success: true,
      message: "BVN verification completed successfully",
      data: {
        bvn: cleanBVN,
        verification_status: "VERIFIED",
        personal_information: {
          first_name: v.first_name || null,
          middle_name: v.middle_name || null,
          last_name: v.last_name || null,
          full_name: `${v.first_name || ""} ${v.middle_name || ""} ${v.last_name || ""}`.trim(),
          date_of_birth: v.date_of_birth || null,
          gender: v.gender || null,
          phone_number: v.phone || null,
          email_address: v.email || null,
          marital_status: v.marital_status || null,
          nationality: v.nationality || null,
          state_of_residence: v.state_of_residence || null,
          lga_of_residence: v.lga_of_residence || null,
          residential_address: v.residential_address || null,
          watch_listed: v.watch_listed || null,
        },
        banking_information: {
          enrollment_bank: v.enrollment_bank || null,
          enrollment_branch: v.enrollment_branch || null,
          registration_date: v.registration_date || null,
          level_of_account: v.level_of_account || null,
          account_status: v.account_status || null,
          name_on_card: v.name_on_card || null,
        },
        verification_details: {
          verified_at: new Date().toISOString(),
          verification_method: "Bank Verification Number Database",
          confidence_score: v.confidence_score || "HIGH",
          data_source: "CBN (Central Bank of Nigeria) BVN Database",
        },
      },
      billing: {
        amount_charged: billing.sellingPrice,
        currency: billing.currency,
        remaining_balance: newBalance,
        transaction_reference: `TXN_${requestId}`,
        billing_cycle: "Pay-per-use",
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString(),
        response_time: `${Date.now() - startTime}ms`,
        api_version: "v1.0.0",
        provider: "Prembly Identity Pass",
        rate_limit: {
          remaining: req.rateLimit?.remaining || null,
          reset_time: req.rateLimit?.resetTime || null,
        },
      },
    });
  } catch (error) {
    console.error("BVN API Error:", error);

    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return res.status(504).json({
        success: false,
        message: "Request timeout",
        error: {
          code: "GATEWAY_TIMEOUT",
          description: "The verification service is taking too long to respond.",
        },
        data: null,
        meta: { request_id: requestId },
      });
    }

    if (error.message === "Insufficient balance") {
      return res.status(402).json({
        success: false,
        message: "Insufficient account balance",
        error: {
          code: "INSUFFICIENT_BALANCE",
          description: "Your account balance is insufficient for this request",
          required_amount: req.billing?.sellingPrice || 0,
          current_balance: userAccount?.balance || 0,
        },
        data: null,
        meta: { request_id: requestId },
      });
    }

    if (error.response?.status === 401) {
      return res.status(502).json({
        success: false,
        message: "Service authentication error",
        error: {
          code: "PROVIDER_AUTH_ERROR",
          description: "Authentication with the provider failed.",
        },
        data: null,
        meta: { request_id: requestId },
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: {
        code: "INTERNAL_SERVER_ERROR",
        description: error.message || "Unexpected failure during request",
        contact_support: "support@ayverify.com.ng",
      },
      data: null,
      meta: { request_id: requestId },
    });
  }
};

module.exports = { verifyBvnAPI };
