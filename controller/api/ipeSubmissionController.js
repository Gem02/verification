require("dotenv").config();
const axios = require("axios");
const validator = require("validator");
const {
  calculateBilling,
  checkAPIBalance,
  deductAPIBalance,
} = require("../../utilities/apiPricing");

const submitIPEAPI = async (req, res) => {
  const startTime = Date.now();
  const requestId = `ipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const { tracking_id } = req.body;

    if (!tracking_id) {
      return res.status(400).json({
        success: false,
        message: "IPE tracking ID is required",
        error: {
          code: "MISSING_REQUIRED_FIELD",
          field: "tracking_id",
          description: "The tracking_id field is required and cannot be empty",
        },
        data: null,
        meta: { request_id: requestId, timestamp: new Date().toISOString(), response_time: `${Date.now() - startTime}ms`, api_version: "v1.0.0" },
      });
    }

    const cleanTrackingId = validator.escape(tracking_id.toString().trim());

    if (cleanTrackingId.length < 5 || cleanTrackingId.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Invalid IPE tracking ID format",
        error: {
          code: "INVALID_TRACKING_ID_FORMAT",
          field: "tracking_id",
          description: "IPE tracking ID must be between 5 and 50 characters",
          provided_length: cleanTrackingId.length,
          expected_range: "5-50 characters",
        },
        data: null,
        meta: { request_id: requestId, timestamp: new Date().toISOString(), response_time: `${Date.now() - startTime}ms`, api_version: "v1.0.0" },
      });
    }

    let amount;
    try {
      amount = await calculateBilling("ipe", req);
    } catch (billingError) {
      console.error("Billing Calculation Error:", billingError);
      return res.status(500).json({
        success: false,
        message: "Billing error",
        error: {
          code: "BILLING_ERROR",
          description: "An error occurred while calculating billing.",
        },
        data: null,
        meta: { request_id: requestId, timestamp: new Date().toISOString(), response_time: `${Date.now() - startTime}ms`, api_version: "v1.0.0" },
      });
    }

    try {
      await checkAPIBalance(req.apiUser._id, amount);
    } catch (balanceError) {
      console.error("Balance Check Error:", balanceError);
      if (balanceError.message === "Insufficient balance") {
        return res.status(402).json({
          success: false,
          message: "Insufficient account balance",
          error: {
            code: "INSUFFICIENT_BALANCE",
            description: "Your account balance is insufficient to complete this request",
            required_amount: amount.sellingPrice,
          },
          data: null,
          meta: { request_id: requestId, timestamp: new Date().toISOString(), response_time: `${Date.now() - startTime}ms`, api_version: "v1.0.0" },
        });
      }

      return res.status(500).json({
        success: false,
        message: "Account balance check failed",
        error: {
          code: "BALANCE_CHECK_ERROR",
          description: "Could not validate your account balance.",
        },
        data: null,
        meta: { request_id: requestId, timestamp: new Date().toISOString(), response_time: `${Date.now() - startTime}ms`, api_version: "v1.0.0" },
      });
    }

    let result;
    try {
      const payload = {
        api_key: process.env.DATA_VERIFY_KEY,
        trackingID: cleanTrackingId,
      };

      const response = await axios.post("https://dataverify.com.ng/api/developers/ipe", payload, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "YourWebsite-API/1.0",
        },
        timeout: 30000,
      });

      result = response.data;
      console.log("IPE Submission Result:", result);
    } catch (apiError) {
      console.error("IPE Provider Error:", apiError);
      return res.status(502).json({
        success: false,
        message: "IPE provider error",
        error: {
          code: "PROVIDER_ERROR",
          description: "Could not fetch data from IPE provider.",
          provider_error: apiError.message,
        },
        data: null,
        meta: { request_id: requestId, timestamp: new Date().toISOString(), response_time: `${Date.now() - startTime}ms`, api_version: "v1.0.0" },
      });
    }

    if (
      !result ||
      result.transactionStatus?.toLowerCase() !== "successful"
    ) {
      return res.status(422).json({
        success: false,
        message: "IPE verification failed",
        error: {
          code: "VERIFICATION_FAILED",
          field: "tracking_id",
          description: "The IPE tracking ID could not be verified",
          provider_response: result?.message || "Unknown provider error",
        },
        data: {
          tracking_id: cleanTrackingId,
          verification_status: "FAILED",
          provider_status: result?.transactionStatus || "UNKNOWN",
        },
        meta: { request_id: requestId, timestamp: new Date().toISOString(), response_time: `${Date.now() - startTime}ms`, api_version: "v1.0.0" },
      });
    }

    const data = {
      response_code: result.response_code || null,
      description: result.description || null,
      verificationType: result.verificationType || null,
      verificationStatus: result.verificationStatus || null,
      transactionStatus: result.transactionStatus || null,
      transactionReference: result.transactionReference || null,
      old_tracking_id: result.old_tracking_id || null,
      newNIN: result.newNIN || null,
      newTracking_id: result.newTracking_id || null,
      message: result.message || null,
      response: result.response || null,
      reply: {
        reply: result.reply?.reply || null,
        nin: result.reply?.nin || null,
        dob: result.reply?.dob || null,
        name: result.reply?.name || null,
        trackingNIN: result.reply?.trackingNIN || null,
      },
    };

    let newBalance;
    try {
      newBalance = await deductAPIBalance(
        req.apiUser._id,
        amount.sellingPrice,
        `API IPE Verification - ${cleanTrackingId}`
      );
    } catch (deductError) {
      console.error("Deduct Balance Error:", deductError);
      return res.status(500).json({
        success: false,
        message: "Billing deduction failed",
        error: {
          code: "BILLING_DEDUCTION_ERROR",
          description: deductError.message || "Could not deduct account balance",
        },
        data: null,
        meta: { request_id: requestId, timestamp: new Date().toISOString(), response_time: `${Date.now() - startTime}ms`, api_version: "v1.0.0" },
      });
    }

    return res.status(200).json({
      success: true,
      message: "IPE verification completed successfully",
      data: {
        tracking_id: cleanTrackingId,
        verification_status: "VERIFIED",
        raw_data: data,
        structured_summary: {
          nin: data.reply.nin,
          full_name: data.reply.name,
          date_of_birth: data.reply.dob,
          old_tracking_id: data.old_tracking_id,
          new_tracking_id: data.newTracking_id,
          reference_number: data.transactionReference,
          verification_status: data.verificationStatus,
        },
        verification_details: {
          verified_at: new Date().toISOString(),
          verification_method: "IPE Tracking System",
          confidence_score:
            data.verificationStatus?.toLowerCase().includes("cleared") ||
            data.transactionStatus?.toLowerCase() === "successful"
              ? "HIGH"
              : "MEDIUM",
          data_source: "Immigration and Population Enrollment (IPE) Database",
          last_updated: new Date().toISOString(),
        },
      },
      billing: {
        amount_charged: amount,
        currency: "NGN",
        remaining_balance: newBalance,
        transaction_reference: `TXN_${requestId}`,
        billing_cycle: "Pay-per-use",
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString(),
        response_time: `${Date.now() - startTime}ms`,
        api_version: "v1.0.0",
        provider: "DataVerify IPE Service",
        rate_limit: {
          remaining: req.rateLimit?.remaining || null,
          reset_time: req.rateLimit?.resetTime || null,
        },
      },
    });
  } catch (error) {
    console.error("Unhandled IPE API Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: {
        code: "INTERNAL_SERVER_ERROR",
        description: "An unexpected error occurred during IPE verification",
        contact_support: "support@yourwebsite.com",
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
};

module.exports = { submitIPEAPI };
