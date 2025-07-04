require("dotenv").config();
const axios = require("axios");
const validator = require("validator");
const {
  calculateBilling,
  checkAPIBalance,
  deductAPIBalance,
} = require("../../utilities/apiPricing");

const demographicAPI = async (req, res) => {
  const startTime = Date.now();
  const requestId = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  let userAccount = null;

  try {
    const { first_name, last_name, date_of_birth, state_of_origin, lga } = req.body;

    const validationErrors = [];

    if (!first_name || first_name.length < 2 || first_name.length > 50) {
      validationErrors.push({
        field: "first_name",
        message: "First name must be between 2 and 50 characters",
        code: "INVALID_FIRST_NAME",
      });
    }

    if (!last_name || last_name.length < 2 || last_name.length > 50) {
      validationErrors.push({
        field: "last_name",
        message: "Last name must be between 2 and 50 characters",
        code: "INVALID_LAST_NAME",
      });
    }

    if (date_of_birth) {
      const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dobRegex.test(date_of_birth)) {
        validationErrors.push({
          field: "date_of_birth",
          message: "Date of birth must be in YYYY-MM-DD format",
          code: "INVALID_DATE_FORMAT",
        });
      } else {
        const dob = new Date(date_of_birth);
        const today = new Date();
        const age = today.getFullYear() - dob.getFullYear();
        if (age < 16 || age > 120) {
          validationErrors.push({
            field: "date_of_birth",
            message: "Age must be between 16 and 120 years",
            code: "INVALID_AGE_RANGE",
          });
        }
      }
    }

    if (state_of_origin && state_of_origin.length > 50) {
      validationErrors.push({
        field: "state_of_origin",
        message: "State of origin must not exceed 50 characters",
        code: "INVALID_STATE_LENGTH",
      });
    }

    if (lga && lga.length > 50) {
      validationErrors.push({
        field: "lga",
        message: "LGA must not exceed 50 characters",
        code: "INVALID_LGA_LENGTH",
      });
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        error: {
          code: "VALIDATION_ERROR",
          description: "One or more fields contain invalid data",
          validation_errors: validationErrors,
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

    const cleanData = {
      first_name: validator.escape(first_name.trim()),
      last_name: validator.escape(last_name.trim()),
      date_of_birth: date_of_birth ? validator.escape(date_of_birth.trim()) : null,
      state_of_origin: state_of_origin ? validator.escape(state_of_origin.trim()) : null,
      lga: lga ? validator.escape(lga.trim()) : null,
    };

    // Billing
    const billing = await calculateBilling("demographic", req);
    userAccount = await checkAPIBalance(req.apiUser._id, billing.sellingPrice);

    // Prepare payload
    const payload = {
      api_key: process.env.DATAVERIFY_API_KEY,
      first_name: cleanData.first_name,
      last_name: cleanData.last_name,
    };

    if (cleanData.date_of_birth) payload.date_of_birth = cleanData.date_of_birth;
    if (cleanData.state_of_origin) payload.state_of_origin = cleanData.state_of_origin;
    if (cleanData.lga) payload.lga = cleanData.lga;

    const response = await axios.post("https://api.dataverify.ng/nin_premium_demo", payload, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "AYVerify-API/1.0",
      },
      timeout: 45000,
    });

    const result = response.data;
    console.log("Demographic Search Result:", result);

    if (!result || result.status === "error" || !result.data || result.data.length === 0) {
      return res.status(422).json({
        success: false,
        message: "No demographic records found",
        error: {
          code: "NO_RECORDS_FOUND",
          description: "No matching records found from the demographic service.",
          provider_response: result?.message || "No results",
        },
        data: {
          search_status: "NO_MATCH",
          search_criteria: payload,
          records_found: 0,
        },
        meta: {
          request_id: requestId,
          timestamp: new Date().toISOString(),
          response_time: `${Date.now() - startTime}ms`,
          api_version: "v1.0.0",
          provider: "DataVerify Demographic Service",
        },
      });
    }

    const processed = result.data.map((entry, i) => ({
      record_id: `${requestId}_${i + 1}`,
      ...entry, // Return all fields directly from provider
    }));

    const newBalance = await deductAPIBalance(
      req.apiUser._id,
      billing.sellingPrice,
      `API Demographic Search - ${cleanData.first_name} ${cleanData.last_name}`
    );

    return res.status(200).json({
      success: true,
      message: "Demographic search completed successfully",
      data: {
        total_records_found: processed.length,
        search_status: "MATCH_FOUND",
        search_criteria: payload,
        records: processed,
        searched_at: new Date().toISOString(),
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
        provider: "DataVerify Demographic Service",
      },
    });
  } catch (error) {
    console.error("Demographic API Error:", error);

    if (error.message === "Insufficient balance") {
      return res.status(402).json({
        success: false,
        message: "Insufficient account balance",
        error: {
          code: "INSUFFICIENT_BALANCE",
          description: "Your account balance is insufficient",
          required_amount: req.billing?.sellingPrice || 0,
          current_balance: userAccount?.balance || 0,
        },
        data: null,
        meta: { request_id: requestId },
      });
    }

    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return res.status(504).json({
        success: false,
        message: "Request timeout",
        error: {
          code: "GATEWAY_TIMEOUT",
          description: "The demographic service is not responding in time",
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
        description: error.message || "Unexpected failure",
        contact_support: "support@ayverify.com.ng",
      },
      data: null,
      meta: { request_id: requestId },
    });
  }
};

module.exports = { demographicAPI };
