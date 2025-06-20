const express = require("express")
const router = express.Router()
const { authenticateAPI, checkPermission, createAPIRateLimit, trackUsage } = require("../middleware/apiAuth")
const { calculateBilling, checkAPIBalance, deductAPIBalance } = require("../utilities/apiPricing")

// Import your existing controllers but we'll create API versions
const { verifyNinAPI } = require("../controller/api/ninApiController")
const { verifyBvnAPI } = require("../controller/api/bvnApiController")
const { verifyIPEAPI } = require("../controller/api/ipeApiController")
const { buyAirtimeAPI } = require("../controller/api/airtimeApiController")
const { buyDataAPI } = require("../controller/api/dataApiController")
const { demographicAPI } = require("../controller/api/demoApiController")
const { personalizationAPI } = require("../controller/api/personalizationApiController")

// Apply API authentication and rate limiting to all routes
router.use(authenticateAPI)
router.use(createAPIRateLimit())

// NIN Verification API
router.post("/verify/nin", checkPermission("nin_verification"), trackUsage("nin_verification"), verifyNinAPI)

// BVN Verification API
router.post("/verify/bvn", checkPermission("bvn_verification"), trackUsage("bvn_verification"), verifyBvnAPI)

// IPE Verification API
router.post("/verify/ipe", checkPermission("ipe_verification"), trackUsage("ipe_verification"), verifyIPEAPI)

// Airtime Purchase API
router.post("/vtu/airtime", checkPermission("airtime"), trackUsage("airtime"), buyAirtimeAPI)

// Data Purchase API
router.post("/vtu/data", checkPermission("data"), trackUsage("data"), buyDataAPI)

// Demographic Search API
router.post("/verify/demographic", checkPermission("demographic"), trackUsage("demographic"), demographicAPI)

// Personalization API
router.post(
  "/verify/personalization",
  checkPermission("personalization"),
  trackUsage("personalization"),
  personalizationAPI,
)

module.exports = router
