require("dotenv").config()
const axios = require("axios")
const validator = require("validator")
const { calculateBilling, checkAPIBalance, deductAPIBalance } = require("../../utilities/apiPricing")

const NETWORK_CODES = {
  1: { name: "MTN", code: "MTN" },
  2: { name: "GLO", code: "GLO" },
  3: { name: "9MOBILE", code: "9MOBILE" },
  4: { name: "AIRTEL", code: "AIRTEL" },
}

const buyDataAPI = async (req, res) => {
  const startTime = Date.now()
  const requestId = `data_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  try {
    const { network, phone, dataPlan, amount } = req.body

    // Input validation
    const validationErrors = []

    if (!network) {
      validationErrors.push({
        field: "network",
        message: "Network is required",
        code: "MISSING_NETWORK",
      })
    } else if (!NETWORK_CODES[network]) {
      validationErrors.push({
        field: "network",
        message: "Invalid network code",
        code: "INVALID_NETWORK",
        valid_options: Object.keys(NETWORK_CODES),
      })
    }

    if (!phone) {
      validationErrors.push({
        field: "phone",
        message: "Phone number is required",
        code: "MISSING_PHONE",
      })
    } else {
      const cleanPhone = validator.escape(phone.toString().trim())
      if (!validator.isMobilePhone(cleanPhone, "en-NG")) {
        validationErrors.push({
          field: "phone",
          message: "Invalid Nigerian phone number format",
          code: "INVALID_PHONE_FORMAT",
          expected_format: "080XXXXXXXX or +234XXXXXXXXXX",
        })
      }
    }

    if (!dataPlan) {
      validationErrors.push({
        field: "dataPlan",
        message: "Data plan is required",
        code: "MISSING_DATA_PLAN",
      })
    }

    if (!amount) {
      validationErrors.push({
        field: "amount",
        message: "Amount is required",
        code: "MISSING_AMOUNT",
      })
    } else if (isNaN(amount) || amount <= 0) {
      validationErrors.push({
        field: "amount",
        message: "Amount must be a positive number",
        code: "INVALID_AMOUNT",
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

    const cleanPhone = validator.escape(phone.toString().trim())
    const networkInfo = NETWORK_CODES[network]

    // Calculate pricing (3% markup)
    const costPrice = amount
    const markup = Math.ceil(amount * 0.03) // 3% markup
    const totalCharge = costPrice + markup

    // Check balance
    const userAccount = await checkAPIBalance(req.apiUser._id, totalCharge)

    // Call third-party API
    const payload = {
      network: Number.parseInt(network),
      mobile_number: cleanPhone,
      plan: Number.parseInt(dataPlan),
      Ported_number: true,
    }

    const response = await axios.post("https://www.husmodata.com/api/data/", payload, {
      headers: {
        Authorization: `Token ${process.env.HUSMODATA_TOKEN}`,
        "Content-Type": "application/json",
      },
      timeout: 45000,
    })

    const result = response.data

    if (!result?.Status || result.Status !== "successful") {
      return res.status(422).json({
        success: false,
        message: "Data purchase failed",
        error: {
          code: "PURCHASE_FAILED",
          description: "The data purchase could not be completed",
          provider_response: result?.message || "Unknown error from provider",
          provider_status: result?.Status || "UNKNOWN",
        },
        data: {
          network: networkInfo.name,
          phone: cleanPhone,
          amount: amount,
          status: "FAILED",
        },
        meta: {
          request_id: requestId,
          timestamp: new Date().toISOString(),
          response_time: `${Date.now() - startTime}ms`,
          api_version: "v1.0.0",
          provider: "Husmodata",
        },
      })
    }

    // Deduct balance after successful purchase
    const newBalance = await deductAPIBalance(
      req.apiUser._id,
      totalCharge,
      `API Data Purchase - ${networkInfo.name} ${result.dataplan} to ${cleanPhone}`,
    )

    // Return comprehensive success response
    return res.status(200).json({
      success: true,
      message: "Data purchase completed successfully",
      data: {
        transaction_id: result.ident || requestId,
        network: {
          name: networkInfo.name,
          code: networkInfo.code,
          network_id: network,
        },
        recipient: {
          phone_number: cleanPhone,
          formatted_phone: cleanPhone.startsWith("+234") ? cleanPhone : `+234${cleanPhone.substring(1)}`,
        },
        purchase_details: {
          data_plan: result.dataplan || `${amount} Data Bundle`,
          amount: amount,
          currency: "NGN",
          status: "SUCCESSFUL",
          completed_at: new Date().toISOString(),
          provider_reference: result.ident || null,
          provider_message: result.message || "Data purchase successful",
          validity_period: result.validity || "30 days",
        },
        delivery_info: {
          delivery_status: "DELIVERED",
          delivery_method: "INSTANT",
          estimated_delivery: "Immediate",
          provider_confirmation: result.Status,
        },
      },
      billing: {
        base_amount: amount,
        service_fee: markup,
        total_charged: totalCharge,
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
        provider: "Husmodata",
        rate_limit: {
          remaining: req.rateLimit?.remaining || null,
          reset_time: req.rateLimit?.resetTime || null,
        },
      },
    })
  } catch (error) {
    console.error("Data API Error:", error)

    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return res.status(504).json({
        success: false,
        message: "Request timeout",
        error: {
          code: "GATEWAY_TIMEOUT",
          description: "The data service is taking too long to respond. Your account has not been charged.",
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

    const { amount } = req.body
    if (error.message === "Insufficient balance") {
      const totalCharge = amount + Math.ceil(amount * 0.03)
      return res.status(402).json({
        success: false,
        message: "Insufficient account balance",
        error: {
          code: "INSUFFICIENT_BALANCE",
          description: "Your account balance is insufficient to complete this data purchase",
          required_amount: totalCharge,
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
          "An unexpected error occurred while processing your data purchase. Please try again or contact support.",
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

module.exports = { buyDataAPI }
