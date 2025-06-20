const ApiToken = require("../models/ApiToken")
const ApiUsage = require("../models/ApiUsage")
const rateLimit = require("express-rate-limit")

// API Authentication Middleware
const authenticateAPI = async (req, res, next) => {
  try {
    const apiKey = req.headers["x-api-key"]
    const apiSecret = req.headers["x-api-secret"]

    if (!apiKey || !apiSecret) {
      return res.status(401).json({
        success: false,
        message: "API credentials required. Include x-api-key and x-api-secret headers.",
      })
    }

    const token = await ApiToken.findOne({ apiKey, isActive: true }).populate("user")

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid API key",
      })
    }

    if (!token.verifySecret(apiSecret)) {
      return res.status(401).json({
        success: false,
        message: "Invalid API secret",
      })
    }

    // Check if token is expired
    if (token.expiresAt && token.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        message: "API token has expired",
      })
    }

    // Check IP whitelist if configured
    if (token.ipWhitelist.length > 0) {
      const clientIP = req.ip || req.connection.remoteAddress
      if (!token.ipWhitelist.includes(clientIP)) {
        return res.status(403).json({
          success: false,
          message: "IP address not whitelisted",
        })
      }
    }

    // Update last used
    token.usage.lastUsed = new Date()
    await token.save()

    req.apiToken = token
    req.apiUser = token.user
    next()
  } catch (error) {
    console.error("API Auth Error:", error)
    return res.status(500).json({
      success: false,
      message: "Authentication error",
    })
  }
}

// Check service permissions
const checkPermission = (service) => {
  return (req, res, next) => {
    if (!req.apiToken.permissions.includes(service)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This API key doesn't have permission for ${service}`,
      })
    }
    next()
  }
}

// API Rate Limiting
const createAPIRateLimit = () => {
  return rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: async (req) => {
      return req.apiToken?.rateLimit?.requestsPerMinute || 60
    },
    keyGenerator: (req) => req.apiToken?.apiKey || req.ip,
    message: {
      success: false,
      message: "Rate limit exceeded. Please check your API limits.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  })
}

// Usage tracking middleware
const trackUsage = (service) => {
  return async (req, res, next) => {
    const startTime = Date.now()

    // Store original res.json to intercept response
    const originalJson = res.json

    res.json = function (data) {
      const responseTime = Date.now() - startTime

      // Track usage asynchronously
      setImmediate(async () => {
        try {
          await ApiUsage.create({
            apiToken: req.apiToken._id,
            user: req.apiUser._id,
            service,
            requestData: {
              endpoint: req.originalUrl,
              method: req.method,
              requestBody: req.body,
              userAgent: req.get("User-Agent"),
              ipAddress: req.ip,
            },
            response: {
              statusCode: res.statusCode,
              success: res.statusCode < 400,
              responseTime,
              errorMessage: res.statusCode >= 400 ? data.message : null,
            },
            billing: req.billing || {},
          })

          // Update token usage stats
          req.apiToken.usage.totalRequests += 1
          if (res.statusCode < 400) {
            req.apiToken.usage.successfulRequests += 1
          } else {
            req.apiToken.usage.failedRequests += 1
          }
          await req.apiToken.save()
        } catch (error) {
          console.error("Usage tracking error:", error)
        }
      })

      return originalJson.call(this, data)
    }

    next()
  }
}

module.exports = {
  authenticateAPI,
  checkPermission,
  createAPIRateLimit,
  trackUsage,
}
