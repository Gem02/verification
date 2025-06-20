const express = require("express")
const router = express.Router()
const { verifyToken } = require("../middleware/authMiddleware") // Your existing auth middleware
const {
  generateApiToken,
  getUserApiTokens,
  updateApiToken,
  deleteApiToken,
  getApiUsage,
  getApiPricing,
} = require("../controller/apiController")

///api/developer//tokens

// router.use(verifyToken)

// API Token Management
router.post("/tokens", generateApiToken)
router.get("/tokens", getUserApiTokens)
router.put("/tokens/:tokenId", updateApiToken)
router.delete("/tokens/:tokenId", deleteApiToken)

// Usage Analytics
router.get("/usage", getApiUsage)

// Available Services and Pricing
router.get("/pricing", getApiPricing)

module.exports = router
