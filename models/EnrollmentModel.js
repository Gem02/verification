// models/Enrollment.js
const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  enrollmentType: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  middleName: {
    type: String,
    default: "",
  },
  surname: {
    type: String,
    required: true,
  },
  dateOfBirth: {
    type: Date,
    required: true,
  },
  stateOfOrigin: {
    type: String,
    required: true,
  },
  localOfOrigin: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  gender: {
    type: String,
    enum: ["Male", "Female", "Other"],
    required: true,
  },
  height: {
    type: String,
    required: true,
  },
  passport: {
    type: String, 
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model("Enrollment", enrollmentSchema);
