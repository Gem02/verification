const ApiToken = require("../models/ApiToken");
const ApiUsage = require("../models/ApiUsage");
const rateLimit = require("express-rate-limit");

// Utility to get client IP properly
const getClientIP = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress
  );
};

// API Authentication Middleware
const authenticateAPI = async (req, res, next) => {
  try {
    const apiKey = req.headers["x-api-key"];
    const apiSecret = req.headers["x-api-secret"];

    if (!apiKey || !apiSecret) {
      return res.status(401).json({
        success: false,
        message: "API credentials required. Include x-api-key and x-api-secret headers.",
      });
    }

    const token = await ApiToken.findOne({ apiKey, isActive: true }).populate("user");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid API key",
      });
    }

    if (!token.verifySecret(apiSecret)) {
      return res.status(401).json({
        success: false,
        message: "Invalid API secret",
      });
    }

    if (token.expiresAt && token.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        message: "API token has expired",
      });
    }

    if (Array.isArray(token.ipWhitelist) && token.ipWhitelist.length > 0) {
      const clientIP = getClientIP(req);
      if (!token.ipWhitelist.includes(clientIP)) {
        return res.status(403).json({
          success: false,
          message: "IP address not whitelisted",
        });
      }
    }

    token.usage.lastUsed = new Date();
    await token.save();

    req.apiToken = token;
    req.apiUser = token.user;
    next();
  } catch (error) {
    console.error("API Auth Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Authentication error",
    });
  }
};

// Check service permissions
const checkPermission = (service) => {
  return (req, res, next) => {
    const permissions = req.apiToken?.permissions || [];
    if (!permissions.includes(service)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This API key doesn't have permission for ${service}`,
      });
    }
    next();
  };
};

// API Rate Limiting Middleware (1 min window)
const createAPIRateLimit = () => {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: async (req) => req.apiToken?.rateLimit?.requestsPerMinute || 60,
    keyGenerator: (req) => req.apiToken?.apiKey || getClientIP(req),
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: "Rate limit exceeded. Please check your API limits.",
      });
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Usage tracking middleware
const trackUsage = (service) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    const originalJson = res.json;

    res.json = function (data) {
      const responseTime = Date.now() - startTime;

      setImmediate(async () => {
        try {
          // Clone and sanitize request body
          const redactedBody = { ...req.body };
          if (redactedBody.pin) redactedBody.pin = "***";

          await ApiUsage.create({
            apiToken: req.apiToken._id,
            user: req.apiUser._id,
            service,
            requestData: {
              endpoint: req.originalUrl,
              method: req.method,
              requestBody: redactedBody,
              userAgent: req.get("User-Agent"),
              ipAddress: getClientIP(req),
            },
            response: {
              statusCode: res.statusCode,
              success: res.statusCode < 400,
              responseTime,
              errorMessage: res.statusCode >= 400 ? data.message : null,
            },
            billing: req.billing || {},
          });

          req.apiToken.usage.totalRequests += 1;
          if (res.statusCode < 400) {
            req.apiToken.usage.successfulRequests += 1;
          } else {
            req.apiToken.usage.failedRequests += 1;
          }

          await req.apiToken.save();
        } catch (error) {
          console.error("Usage tracking error:", error.message);
        }
      });

      return originalJson.call(this, data);
    };

    next();
  };
};

module.exports = {
  authenticateAPI,
  checkPermission,
  createAPIRateLimit,
  trackUsage,
};
