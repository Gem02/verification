const mongoose = require("mongoose")

const pricingSchema = new mongoose.Schema({
  serviceName: {
    type: String,
    required: true,
    unique: true,
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
  displayName: {
    type: String,
    required: true,
  },
  description: String,
  pricing: {
    costPrice: { type: Number, required: true }, // What you pay to third-party
    sellingPrice: { type: Number, required: true }, // What you charge developers
    currency: { type: String, default: "NGN" },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  metadata: {
    provider: String, // husmodata, prembly, dataverify
    endpoint: String,
    category: {
      type: String,
      enum: ["verification", "vtu", "utility"],
    },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

pricingSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

module.exports = mongoose.model("Pricing", pricingSchema)
