require("dotenv").config()
const axios = require("axios")
const validator = require("validator")
const { calculateBilling, checkAPIBalance, deductAPIBalance } = require("../../utilities/apiPricing")

const verifyBvnAPI = async (req, res) => {
  const startTime = Date.now()
  const requestId = `bvn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  try {
    const { bvn } = req.body

    // Input validation
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
      })
    }

    const cleanBVN = validator.escape(bvn.toString().trim())

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
      })
    }

    // Calculate pricing and check balance
    const amount = await calculateBilling("bvn_verification", req)
    const userAccount = await checkAPIBalance(req.apiUser._id, amount)

    // Call third-party API
    const base_url = process.env.PREMBLY_BASE_URL
    const response = await axios.post(
      `${base_url}/identitypass/verification/bvn`,
      { number: cleanBVN },
      {
        headers: {
          "x-api-key": process.env.PREMBLY_API_KEY,
          "app-id": process.env.PREMBLY_APP_ID,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      },
    )

    const result = response.data

    // Check verification status
    if (!result?.status || result.verification?.status !== "VERIFIED") {
      return res.status(422).json({
        success: false,
        message: "BVN verification failed",
        error: {
          code: "VERIFICATION_FAILED",
          field: "bvn",
          description: "The provided BVN could not be verified with the banking database",
          provider_response: result?.message || "Unknown error from verification provider",
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
      })
    }

    // Deduct balance after successful verification
    const newBalance = await deductAPIBalance(req.apiUser._id, amount, `API BVN Verification - ${cleanBVN}`)

    // Return comprehensive success response
    return res.status(200).json({
      success: true,
      message: "BVN verification completed successfully",
      data: {
        bvn: cleanBVN,
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
          nationality: result.verification.nationality || null,
          state_of_residence: result.verification.state_of_residence || null,
          lga_of_residence: result.verification.lga_of_residence || null,
          residential_address: result.verification.residential_address || null,
          watch_listed: result.verification.watch_listed || null,
        },
        banking_information: {
          enrollment_bank: result.verification.enrollment_bank || null,
          enrollment_branch: result.verification.enrollment_branch || null,
          registration_date: result.verification.registration_date || null,
          level_of_account: result.verification.level_of_account || null,
          account_status: result.verification.account_status || null,
          name_on_card: result.verification.name_on_card || null,
        },
        verification_details: {
          verified_at: new Date().toISOString(),
          verification_method: "Bank Verification Number Database",
          confidence_score: result.verification.confidence_score || "HIGH",
          data_source: "CBN (Central Bank of Nigeria) BVN Database",
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
        provider: "Prembly Identity Pass",
        rate_limit: {
          remaining: req.rateLimit?.remaining || null,
          reset_time: req.rateLimit?.resetTime || null,
        },
      },
    })
  } catch (error) {
    console.error("BVN API Error:", error)

    // Handle different types of errors (similar to NIN controller)
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return res.status(504).json({
        success: false,
        message: "Request timeout",
        error: {
          code: "GATEWAY_TIMEOUT",
          description: "The verification service is taking too long to respond. Please try again.",
          retry_after: "30 seconds",
        },
        data: null,
        meta: {
          request_id: requestId,
          timestamp: new Date().toISOString(),
          response_time: `${Date.now() - startTime}ms`,
          api_version: "v1.0.0",
        },
      })
    }

    if (error.message === "Insufficient balance") {
      return res.status(402).json({
        success: false,
        message: "Insufficient account balance",
        error: {
          code: "INSUFFICIENT_BALANCE",
          description: "Your account balance is insufficient to complete this request",
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
      })
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
    })
  }
}

module.exports = { verifyBvnAPI }
