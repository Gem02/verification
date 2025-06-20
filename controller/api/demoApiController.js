require("dotenv").config()
const axios = require("axios")
const validator = require("validator")
const { calculateBilling, checkAPIBalance, deductAPIBalance } = require("../../utilities/apiPricing")

const demographicAPI = async (req, res) => {
  const startTime = Date.now()
  const requestId = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  try {
    const { first_name, last_name, date_of_birth, state_of_origin, lga } = req.body

    // Input validation
    const validationErrors = []

    if (!first_name) {
      validationErrors.push({
        field: "first_name",
        message: "First name is required",
        code: "MISSING_FIRST_NAME",
      })
    } else if (first_name.length < 2 || first_name.length > 50) {
      validationErrors.push({
        field: "first_name",
        message: "First name must be between 2 and 50 characters",
        code: "INVALID_FIRST_NAME_LENGTH",
      })
    }

    if (!last_name) {
      validationErrors.push({
        field: "last_name",
        message: "Last name is required",
        code: "MISSING_LAST_NAME",
      })
    } else if (last_name.length < 2 || last_name.length > 50) {
      validationErrors.push({
        field: "last_name",
        message: "Last name must be between 2 and 50 characters",
        code: "INVALID_LAST_NAME_LENGTH",
      })
    }

    if (date_of_birth) {
      const dobRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dobRegex.test(date_of_birth)) {
        validationErrors.push({
          field: "date_of_birth",
          message: "Date of birth must be in YYYY-MM-DD format",
          code: "INVALID_DATE_FORMAT",
          expected_format: "YYYY-MM-DD",
        })
      } else {
        const dob = new Date(date_of_birth)
        const today = new Date()
        const age = today.getFullYear() - dob.getFullYear()
        if (age < 16 || age > 120) {
          validationErrors.push({
            field: "date_of_birth",
            message: "Age must be between 16 and 120 years",
            code: "INVALID_AGE_RANGE",
          })
        }
      }
    }

    if (state_of_origin && state_of_origin.length > 50) {
      validationErrors.push({
        field: "state_of_origin",
        message: "State of origin must not exceed 50 characters",
        code: "INVALID_STATE_LENGTH",
      })
    }

    if (lga && lga.length > 50) {
      validationErrors.push({
        field: "lga",
        message: "LGA must not exceed 50 characters",
        code: "INVALID_LGA_LENGTH",
      })
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
      })
    }

    // Sanitize inputs
    const cleanFirstName = validator.escape(first_name.toString().trim())
    const cleanLastName = validator.escape(last_name.toString().trim())
    const cleanDOB = date_of_birth ? validator.escape(date_of_birth.toString().trim()) : null
    const cleanState = state_of_origin ? validator.escape(state_of_origin.toString().trim()) : null
    const cleanLGA = lga ? validator.escape(lga.toString().trim()) : null

    // Calculate pricing and check balance
    const amount = await calculateBilling("demographic", req)
    const userAccount = await checkAPIBalance(req.apiUser._id, amount)

    // Prepare search payload
    const searchPayload = {
      first_name: cleanFirstName,
      last_name: cleanLastName,
      api_key: process.env.DATAVERIFY_API_KEY,
    }

    // Add optional fields if provided
    if (cleanDOB) searchPayload.date_of_birth = cleanDOB
    if (cleanState) searchPayload.state_of_origin = cleanState
    if (cleanLGA) searchPayload.lga = cleanLGA

    // Call third-party API
    const response = await axios.post("https://api.dataverify.ng/nin_premium_demo", searchPayload, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "YourWebsite-API/1.0",
      },
      timeout: 45000,
    })

    const result = response.data

    // Check search results
    if (!result || result.status === "error" || !result.data || result.data.length === 0) {
      return res.status(422).json({
        success: false,
        message: "No demographic records found",
        error: {
          code: "NO_RECORDS_FOUND",
          description: "No records match the provided demographic information",
          provider_response: result?.message || "No matching records found",
          search_criteria: {
            first_name: cleanFirstName,
            last_name: cleanLastName,
            date_of_birth: cleanDOB,
            state_of_origin: cleanState,
            lga: cleanLGA,
          },
        },
        data: {
          search_status: "NO_MATCH",
          records_found: 0,
          search_criteria: searchPayload,
        },
        meta: {
          request_id: requestId,
          timestamp: new Date().toISOString(),
          response_time: `${Date.now() - startTime}ms`,
          api_version: "v1.0.0",
          provider: "DataVerify Demographic Service",
        },
      })
    }

    // Deduct balance after successful search
    const newBalance = await deductAPIBalance(
      req.apiUser._id,
      amount,
      `API Demographic Search - ${cleanFirstName} ${cleanLastName}`,
    )

    // Process and format results
    const processedRecords = result.data.map((record, index) => ({
      record_id: `${requestId}_${index + 1}`,
      personal_information: {
        nin: record.nin || null,
        first_name: record.first_name || null,
        middle_name: record.middle_name || null,
        last_name: record.last_name || null,
        full_name:
          record.full_name || `${record.first_name || ""} ${record.middle_name || ""} ${record.last_name || ""}`.trim(),
        date_of_birth: record.date_of_birth || null,
        gender: record.gender || null,
        phone_number: record.phone || null,
        email_address: record.email || null,
        marital_status: record.marital_status || null,
        nationality: record.nationality || null,
        religion: record.religion || null,
        profession: record.profession || null,
        educational_level: record.educational_level || null,
        employment_status: record.employment_status || null,
      },
      location_information: {
        state_of_origin: record.state_of_origin || null,
        lga_of_origin: record.lga_of_origin || null,
        state_of_residence: record.state_of_residence || null,
        lga_of_residence: record.lga_of_residence || null,
        residential_address: record.residential_address || null,
        place_of_birth: record.place_of_birth || null,
      },
      family_information: {
        next_of_kin: record.next_of_kin || null,
        next_of_kin_address: record.next_of_kin_address || null,
        next_of_kin_phone: record.next_of_kin_phone || null,
        next_of_kin_state: record.next_of_kin_state || null,
        next_of_kin_lga: record.next_of_kin_lga || null,
        next_of_kin_relationship: record.next_of_kin_relationship || null,
      },
      match_confidence: {
        overall_score: record.match_score || "MEDIUM",
        name_match: record.name_match_score || null,
        dob_match: record.dob_match_score || null,
        location_match: record.location_match_score || null,
      },
    }))

    // Return comprehensive success response
    return res.status(200).json({
      success: true,
      message: "Demographic search completed successfully",
      data: {
        search_criteria: {
          first_name: cleanFirstName,
          last_name: cleanLastName,
          date_of_birth: cleanDOB,
          state_of_origin: cleanState,
          lga: cleanLGA,
        },
        search_results: {
          total_records_found: processedRecords.length,
          records: processedRecords,
          search_status: "MATCH_FOUND",
          search_quality: processedRecords.length > 5 ? "HIGH" : processedRecords.length > 2 ? "MEDIUM" : "LOW",
        },
        search_details: {
          searched_at: new Date().toISOString(),
          search_method: "Demographic Database Query",
          data_source: "National Identity Management Commission (NIMC) Database",
          search_scope: "Nigeria-wide demographic records",
          privacy_compliance: "GDPR and NDPR compliant",
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
        provider: "DataVerify Demographic Service",
        rate_limit: {
          remaining: req.rateLimit?.remaining || null,
          reset_time: req.rateLimit?.resetTime || null,
        },
      },
    })
  } catch (error) {
    console.error("Demographic API Error:", error)

    // Handle different types of errors
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return res.status(504).json({
        success: false,
        message: "Request timeout",
        error: {
          code: "GATEWAY_TIMEOUT",
          description: "The demographic search service is taking too long to respond. Please try again.",
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
          description: "There's an issue with our demographic search service provider. Our team has been notified.",
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
          description: "Your account balance is insufficient to complete this demographic search",
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
          "An unexpected error occurred while processing your demographic search. Please try again or contact support if the issue persists.",
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

module.exports = { demographicAPI }
