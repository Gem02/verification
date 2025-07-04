require("dotenv").config();
const axios = require("axios");
const validator = require("validator");
const {
  calculateBilling,
  checkAPIBalance,
  deductAPIBalance,
} = require("../../utilities/apiPricing");

const checkStatusIPEAPI = async (req, res) => {
  const startTime = Date.now();
  const requestId = `ipe_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

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
        meta: {
          request_id: requestId,
          timestamp: new Date().toISOString(),
          response_time: `${Date.now() - startTime}ms`,
          api_version: "v1.0.0",
        },
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
        meta: {
          request_id: requestId,
          timestamp: new Date().toISOString(),
          response_time: `${Date.now() - startTime}ms`,
          api_version: "v1.0.0",
        },
      });
    }

    const amount = await calculateBilling("ipe", req);
    const userAccount = await checkAPIBalance(req.apiUser._id, amount);

    const payload = {
      api_key: process.env.DATA_VERIFY_KEY,
      trackingID: cleanTrackingId,
    };

    const response = await axios.post(
      "https://dataverify.com.ng/api/developers/ipe_status.php",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "YourWebsite-API/1.0",
        },
        timeout: 30000,
      }
    );

    const result = response.data;
    console.log("IPE Verification Result:", result);

    // Validate response
    if (
      !result ||
      result.transactionStatus?.toLowerCase() !== "successful" ||
      !result.reply
    ) {
      return res.status(422).json({
        success: false,
        message: "IPE verification failed",
        error: {
          code: "VERIFICATION_FAILED",
          field: "tracking_id",
          description:
            "The provided IPE tracking ID could not be verified or does not exist",
          provider_response: result?.message || "Unknown provider error",
        },
        data: {
          tracking_id: cleanTrackingId,
          verification_status: "FAILED",
          provider_status: result?.transactionStatus || "UNKNOWN",
        },
        meta: {
          request_id: requestId,
          timestamp: new Date().toISOString(),
          response_time: `${Date.now() - startTime}ms`,
          api_version: "v1.0.0",
          provider: "DataVerify IPE Service",
        },
      });
    }

    // Merge top-level and reply data
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

    const newBalance = await deductAPIBalance(
      req.apiUser._id,
      amount,
      `API IPE Verification - ${cleanTrackingId}`
    );

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
    console.error("IPE API Error:", error);

    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return res.status(504).json({
        success: false,
        message: "Request timeout",
        error: {
          code: "GATEWAY_TIMEOUT",
          description:
            "The IPE verification service is taking too long to respond. Please try again.",
          retry_after: "30 seconds",
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

    if (error.message === "Insufficient balance") {
      return res.status(402).json({
        success: false,
        message: "Insufficient account balance",
        error: {
          code: "INSUFFICIENT_BALANCE",
          description:
            "Your account balance is insufficient to complete this request",
          required_amount: req.billing?.sellingPrice || 0,
          top_up_url: "https://yourwebsite.com/dashboard/wallet",
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

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: {
        code: "INTERNAL_SERVER_ERROR",
        description:
          "An unexpected error occurred while processing your request. Please try again or contact support if the issue persists.",
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

module.exports = { checkStatusIPEAPI };
