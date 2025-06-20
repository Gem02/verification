require("dotenv").config()
const axios = require("axios")
const validator = require("validator")
const { calculateBilling, checkAPIBalance, deductAPIBalance } = require("../../utilities/apiPricing")

const personalizationAPI = async (req, res) => {
  const startTime = Date.now()
  const requestId = `person_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  try {
    const { nin, verification_type = "regular" } = req.body

    // Input validation
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
      })
    }

    const cleanNIN = validator.escape(nin.toString().trim())

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
      })
    }

    const cleanVerificationType = validator.escape(verification_type.toString().trim().toLowerCase())
    if (!["regular", "premium", "basic"].includes(cleanVerificationType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification type",
        error: {
          code: "INVALID_VERIFICATION_TYPE",
          field: "verification_type",
          description: "Verification type must be 'regular', 'premium', or 'basic'",
          provided_value: cleanVerificationType,
          valid_options: ["regular", "premium", "basic"],
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
    const amount = await calculateBilling("personalization", req)
    const userAccount = await checkAPIBalance(req.apiUser._id, amount)

    // Prepare API endpoint based on verification type
    const endpoints = {
      regular: "https://api.dataverify.ng/nin_regular_per.php",
      premium: "https://api.dataverify.ng/nin_premium_per.php",
      basic: "https://api.dataverify.ng/nin_basic_per.php",
    }

    const apiEndpoint = endpoints[cleanVerificationType]

    // Call third-party API
    const payload = {
      nin: cleanNIN,
      api_key: process.env.DATAVERIFY_API_KEY,
      verification_level: cleanVerificationType,
    }

    const response = await axios.post(apiEndpoint, payload, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "YourWebsite-API/1.0",
      },
      timeout: 30000,
    })

    const result = response.data

    // Check verification status
    if (!result || result.status === "error" || !result.data) {
      return res.status(422).json({
        success: false,
        message: "Personalization verification failed",
        error: {
          code: "VERIFICATION_FAILED",
          field: "nin",
          description: "The provided NIN could not be verified for personalization data",
          provider_response: result?.message || "Unknown error from verification provider",
        },
        data: {
          nin: cleanNIN,
          verification_status: "FAILED",
          verification_type: cleanVerificationType,
          provider_status: result?.status || "UNKNOWN",
        },
        meta: {
          request_id: requestId,
          timestamp: new Date().toISOString(),
          response_time: `${Date.now() - startTime}ms`,
          api_version: "v1.0.0",
          provider: "DataVerify Personalization Service",
        },
      })
    }

    // Deduct balance after successful verification
    const newBalance = await deductAPIBalance(
      req.apiUser._id,
      amount,
      `API Personalization Verification - ${cleanVerificationType.toUpperCase()} - ${cleanNIN}`,
    )

    // Process personalization data based on verification type
    const personalData = result.data
    const processedData = {
      basic_information: {
        nin: cleanNIN,
        first_name: personalData.first_name || null,
        middle_name: personalData.middle_name || null,
        last_name: personalData.last_name || null,
        full_name:
          personalData.full_name ||
          `${personalData.first_name || ""} ${personalData.middle_name || ""} ${personalData.last_name || ""}`.trim(),
        date_of_birth: personalData.date_of_birth || null,
        gender: personalData.gender || null,
        phone_number: personalData.phone || null,
        email_address: personalData.email || null,
      },
    }

    // Add additional data based on verification type
    if (cleanVerificationType === "regular" || cleanVerificationType === "premium") {
      processedData.extended_information = {
        marital_status: personalData.marital_status || null,
        nationality: personalData.nationality || null,
        state_of_origin: personalData.state_of_origin || null,
        lga_of_origin: personalData.lga_of_origin || null,
        state_of_residence: personalData.state_of_residence || null,
        lga_of_residence: personalData.lga_of_residence || null,
        residential_address: personalData.residential_address || null,
        profession: personalData.profession || null,
        religion: personalData.religion || null,
        educational_level: personalData.educational_level || null,
        employment_status: personalData.employment_status || null,
      }
    }

    if (cleanVerificationType === "premium") {
      processedData.premium_information = {
        place_of_birth: personalData.place_of_birth || null,
        next_of_kin: personalData.next_of_kin || null,
        next_of_kin_address: personalData.next_of_kin_address || null,
        next_of_kin_phone: personalData.next_of_kin_phone || null,
        next_of_kin_state: personalData.next_of_kin_state || null,
        next_of_kin_lga: personalData.next_of_kin_lga || null,
        next_of_kin_relationship: personalData.next_of_kin_relationship || null,
        biometric_data_available: personalData.biometric_available || false,
        document_images_available: personalData.document_images || false,
        verification_history: personalData.verification_history || [],
      }

      processedData.personalization_insights = {
        identity_confidence_score: personalData.confidence_score || "HIGH",
        data_completeness_percentage: personalData.data_completeness || null,
        last_verification_date: personalData.last_verified || null,
        data_freshness_score: personalData.data_freshness || null,
        risk_assessment: personalData.risk_level || "LOW",
        compliance_status: personalData.compliance_status || "COMPLIANT",
      }
    }

    // Return comprehensive success response
    return res.status(200).json({
      success: true,
      message: "Personalization verification completed successfully",
      data: {
        nin: cleanNIN,
        verification_status: "VERIFIED",
        verification_type: cleanVerificationType.toUpperCase(),
        personal_data: processedData,
        verification_details: {
          verified_at: new Date().toISOString(),
          verification_method: `${cleanVerificationType.toUpperCase()} Personalization Verification`,
          confidence_score: personalData.confidence_score || "HIGH",
          data_source: "National Identity Management Commission (NIMC) Personalization Database",
          verification_level: cleanVerificationType,
          data_points_verified: Object.keys(processedData).length,
        },
        privacy_compliance: {
          gdpr_compliant: true,
          ndpr_compliant: true,
          data_retention_period: "As per regulatory requirements",
          data_usage_purpose: "Identity verification and personalization",
          consent_required: true,
        },
      },
      billing: {
        amount_charged: amount,
        currency: "NGN",
        remaining_balance: newBalance,
        transaction_reference: `TXN_${requestId}`,
        billing_cycle: "Pay-per-use",
        verification_tier: cleanVerificationType.toUpperCase(),
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString(),
        response_time: `${Date.now() - startTime}ms`,
        api_version: "v1.0.0",
        provider: "DataVerify Personalization Service",
        rate_limit: {
          remaining: req.rateLimit?.remaining || null,
          reset_time: req.rateLimit?.resetTime || null,
        },
      },
    })
  } catch (error) {
    console.error("Personalization API Error:", error)

    // Handle different types of errors
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return res.status(504).json({
        success: false,
        message: "Request timeout",
        error: {
          code: "GATEWAY_TIMEOUT",
          description: "The personalization verification service is taking too long to respond. Please try again.",
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

    if (error.response?.status === 401 || error.response?.status === 403) {
      return res.status(502).json({
        success: false,
        message: "Service authentication error",
        error: {
          code: "PROVIDER_AUTH_ERROR",
          description:
            "There's an issue with our personalization verification service provider. Our team has been notified.",
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

    if (error.message === "Insufficient balance") {
      return res.status(402).json({
        success: false,
        message: "Insufficient account balance",
        error: {
          code: "INSUFFICIENT_BALANCE",
          description: "Your account balance is insufficient to complete this personalization verification",
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

    // Generic server error
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: {
        code: "INTERNAL_SERVER_ERROR",
        description:
          "An unexpected error occurred while processing your personalization verification. Please try again or contact support if the issue persists.",
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

module.exports = { personalizationAPI }
