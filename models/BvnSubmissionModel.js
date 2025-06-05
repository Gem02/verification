// models/BvnSubmission.js
const mongoose = require('mongoose');

const BvnSubmissionSchema = new mongoose.Schema({
  userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  bankName: { type: String},
  stateOfResidence: { type: String},
  lga: { type: String},
  agentLocation: { type: String},
  bvn: { type: String},
  accountNumber: { type: String},
  firstName: { type: String},
  lastName: { type: String},
  email: { type: String},
  alternativeEmail: { type: String},
  phone: { type: String},
  alternativePhone: { type: String},
  address: { type: String},
  dob: { type: String}, 
  geoPoliticalZone: { type: String},
  passport: { type: String}, 
}, { timestamps: true });

module.exports = mongoose.model('BvnSubmission', BvnSubmissionSchema);
