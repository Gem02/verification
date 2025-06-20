const mongoose = require("mongoose")

const apiUsageSchema = new mongoose.Schema({
  apiToken: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ApiToken",
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  service: {
    type: String,
    required: true,
    enum: [
      "nin_verification",
      "bvn_verification",
      "ipe_verification",
      "airtime",
      "data",
      "demographic",
      "personalization",
    ],
  },
  requestData: {
    endpoint: String,
    method: String,
    requestBody: mongoose.Schema.Types.Mixed,
    userAgent: String,
    ipAddress: String,
  },
  response: {
    statusCode: Number,
    success: Boolean,
    responseTime: Number, // in milliseconds
    errorMessage: String,
  },
  billing: {
    costPrice: Number,
    sellingPrice: Number,
    profit: Number,
    currency: { type: String, default: "NGN" },
  },
  timestamp: { type: Date, default: Date.now },
  month: { type: String, default: () => new Date().toISOString().slice(0, 7) }, // YYYY-MM for easy querying
  day: { type: String, default: () => new Date().toISOString().slice(0, 10) }, // YYYY-MM-DD
})

// Indexes for efficient querying
apiUsageSchema.index({ apiToken: 1, timestamp: -1 })
apiUsageSchema.index({ user: 1, month: 1 })
apiUsageSchema.index({ service: 1, day: 1 })

module.exports = mongoose.model("ApiUsage", apiUsageSchema)
