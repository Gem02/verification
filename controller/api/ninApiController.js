require("dotenv").config();
const axios = require("axios");
const validator = require("validator");
const {
  calculateBilling,
  checkAPIBalance,
  deductAPIBalance,
} = require("../../utilities/apiPricing");

const verifyNinAPI = async (req, res) => {
  const startTime = Date.now();
  const requestId = `nin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  let userAccount = null;

  try {
    const { nin } = req.body;

    // Step 1: Validate input
    if (!nin) {
      return res.status(400).json({
        success: false,
        message: "NIN is required",
        error: {
          code: "MISSING_REQUIRED_FIELD",
          field: "nin",
          description: "The NIN field is required and cannot be empty",
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

    const cleanNIN = validator.escape(nin.toString().trim());
    if (!validator.isNumeric(cleanNIN) || cleanNIN.length !== 11) {
      return res.status(400).json({
        success: false,
        message: "Invalid NIN format",
        error: {
          code: "INVALID_NIN_FORMAT",
          field: "nin",
          description: "NIN must be exactly 11 digits",
          provided_length: cleanNIN.length,
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

    // Step 2: Calculate billing and check user balance
    let billing = null;
    try {
      billing = await calculateBilling("nin_verification", req);
    } catch (error) {
      console.error("Billing error:", error.message);
      throw new Error("Failed to calculate billing");
    }

    try {
      userAccount = await checkAPIBalance(req.apiUser._id, billing.sellingPrice);
    } catch (error) {
      console.error("Balance check error:", error.message);
      throw error;
    }

    // Step 3: Call the external API
    let response;
    try {
      const base_url = process.env.PREMBLY_BASE_URL;
      response = await axios.post(
        `${base_url}/identitypass/verification/vnin`,
        { number: cleanNIN },
        {
          headers: {
            "x-api-key": process.env.PREMBLY_API_KEY,
            "app-id": process.env.PREMBLY_APP_ID,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );
    } catch (error) {
      console.error("Prembly API call failed:", error.message, error.response?.data);
      throw error;
    }

    const result = response.data;

    if (!result?.status || result?.verification?.status !== "VERIFIED") {
      return res.status(422).json({
        success: false,
        message: "NIN verification failed",
        error: {
          code: "VERIFICATION_FAILED",
          field: "nin",
          description: "The provided NIN could not be verified with the national database",
          provider_response:
            result?.message || result?.verification?.status || "Unknown error from provider",
        },
        data: {
          nin: cleanNIN,
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

    // Step 4: Deduct balance
    let newBalance;
    try {
      newBalance = await deductAPIBalance(
        req.apiUser._id,
        billing.sellingPrice,
        `API NIN Verification - ${cleanNIN}`
      );
    } catch (error) {
      console.error("Deduction error:", error.message);
      throw error;
    }

    // Step 5: Return success
    return res.status(200).json({
      success: true,
      message: "NIN verification completed successfully",
      data: {
        nin: cleanNIN,
        verification_status: "VERIFIED",
        personal_information: {
          first_name: result.verification.first_name || null,
          middle_name: result.verification.middle_name || null,
          last_name: result.verification.last_name || null,
          full_name:
            `${result.verification.first_name || ""} ${result.verification.middle_name || ""} ${result.verification.last_name || ""}`.trim(),
          date_of_birth: result.verification.date_of_birth || null,
          gender: result.verification.gender || null,
          phone_number: result.verification.phone || null,
          email_address: result.verification.email || null,
          marital_status: result.verification.marital_status || null,
          state_of_origin: result.verification.state_of_origin || null,
          state_of_residence: result.verification.state_of_residence || null,
          lga_of_origin: result.verification.lga_of_origin || null,
          lga_of_residence: result.verification.lga_of_residence || null,
          residential_address: result.verification.residential_address || null,
          nationality: result.verification.nationality || null,
          profession: result.verification.profession || null,
          religion: result.verification.religion || null,
          educational_level: result.verification.educational_level || null,
          employment_status: result.verification.employment_status || null,
          place_of_birth: result.verification.place_of_birth || null,
          next_of_kin: result.verification.next_of_kin || null,
          next_of_kin_address: result.verification.next_of_kin_address || null,
          next_of_kin_phone: result.verification.next_of_kin_phone || null,
          next_of_kin_state: result.verification.next_of_kin_state || null,
          next_of_kin_lga: result.verification.next_of_kin_lga || null,
          next_of_kin_relationship: result.verification.next_of_kin_relationship || null,
        },
        verification_details: {
          verified_at: new Date().toISOString(),
          verification_method: "National Identity Database",
          confidence_score: result.verification.confidence_score || "HIGH",
          data_source: "NIMC (National Identity Management Commission)",
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
      },
    });
  } catch (error) {
    // Handle known and unknown errors
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

module.exports = { verifyNinAPI };
