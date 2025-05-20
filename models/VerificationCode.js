const mongoose = require('mongoose');

const verificationCodeSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String },
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 } 
});

const VerificationCode = mongoose.model('VerificationCode', verificationCodeSchema);
module.exports = VerificationCode;
