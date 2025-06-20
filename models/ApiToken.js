const mongoose = require("mongoose")
const crypto = require("crypto")

const apiTokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  tokenName: {
    type: String,
    required: true,
    trim: true,
  },
  apiKey: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  secretKey: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  rateLimit: {
    requestsPerMinute: { type: Number, default: 60 },
    requestsPerHour: { type: Number, default: 1000 },
    requestsPerDay: { type: Number, default: 10000 },
  },
  usage: {
    totalRequests: { type: Number, default: 0 },
    successfulRequests: { type: Number, default: 0 },
    failedRequests: { type: Number, default: 0 },
    lastUsed: { type: Date, default: null },
  },
  ipWhitelist: [String],
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null },
})


apiTokenSchema.methods.generateKeys = function () {
  this.apiKey = "pk_" + crypto.randomBytes(16).toString("hex")
  this.secretKey = "sk_" + crypto.randomBytes(32).toString("hex")
}


apiTokenSchema.methods.verifySecret = function (providedSecret) {
  return this.secretKey === providedSecret
}

module.exports = mongoose.model("ApiToken", apiTokenSchema)
