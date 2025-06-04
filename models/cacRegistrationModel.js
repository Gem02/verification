const mongoose = require('mongoose');

const cacRegistrationSchema = new mongoose.Schema({
  registrationType: { type: String, enum: ['BN', 'LLC', 'NGO'], required: true },
  surname: { type: String, required: true },
  firstName: { type: String, required: true },
  otherName: { type: String },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  phoneNumber: { type: String, required: true },
  homeAddress: { type: String },
  officeAddress: { type: String },
  natureOfBusiness: { type: String },
  businessName1: { type: String },
  businessName2: { type: String },
  bvnNumber: { type: String },
  ninNumber: { type: String },
  passport: { type: String }, 
  email: { type: String, required: true },
  stateOfOrigin: { type: String },
  localGovtOrigin: { type: String },
  signature: { type: String }, 
}, {
  timestamps: true
});

module.exports = mongoose.model('CacRegistration', cacRegistrationSchema);
