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

    // Input validation
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

    // Calculate billing and check balance
    const amount = await calculateBilling("ipe", req);
    const userAccount = await checkAPIBalance(req.apiUser._id, amount);

    // Send request to provider
    const payload = {
      tracking_id: cleanTrackingId,
      api_key: process.env.DATAVERIFY_API_KEY,
    };

    const response = await axios.post(
      "https://api.dataverify.ng/ipe_status.php",
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

    if (!result || result.status === "error" || !result.data) {
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
          provider_status: result?.status || "UNKNOWN",
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

    const data = result.data;

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
        raw_data: {
          status: data.status || null,
          application_type: data.application_type || null,
          application_date: data.application_date || null,
          processing_stage: data.processing_stage || null,
          current_location: data.current_location || null,
          estimated_completion: data.estimated_completion || null,
          applicant_name: data.applicant_name || null,
          reference_number: data.reference_number || null,
          application_center: data.application_center || null,
          document_type: data.document_type || null,
          collection_status: data.collection_status || null,
          collection_date: data.collection_date || null,
          remarks: data.remarks || null,
          progress_percentage: data.progress_percentage || null,
          next_action: data.next_action || null,
          last_updated: data.last_updated || null,
        },
        processing_summary: {
          current_stage: data.processing_stage || null,
          progress_percentage: data.progress_percentage || null,
          next_action_required: data.next_action || null,
          expected_completion_date: data.estimated_completion || null,
          processing_center: data.current_location || null,
        },
        verification_details: {
          verified_at: new Date().toISOString(),
          verification_method: "IPE Tracking System",
          confidence_score:
            data.status?.toLowerCase() === "completed" ? "HIGH" : "MEDIUM",
          data_source: "Immigration and Population Enrollment (IPE) Database",
          last_updated: data.last_updated || new Date().toISOString(),
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
