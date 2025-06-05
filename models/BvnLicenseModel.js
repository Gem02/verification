// models/BvnLicenseSubmission.js
const mongoose = require('mongoose');

const BvnLicenseSubmissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assuming you have a User model
    required: true
  },
  licenseType: { type: String},
  bankName: { type: String},
  bvn: { type: String},
  accountNumber: { type: String},
  firstName: { type: String},
  lastName: { type: String},
  otherName: { type: String},
  email: { type: String},
  alternativeEmail: { type: String},
  phone: { type: String},
  alternativePhone: { type: String},
  address: { type: String},
  dateOfBirth: { type: String}, // or Date
  stateOfResidence: { type: String},
  lga: { type: String},
  geoPoliticalZone: { type: String},
}, { timestamps: true });

module.exports = mongoose.model('BvnLicenseSubmission', BvnLicenseSubmissionSchema);
