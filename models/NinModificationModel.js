const mongoose = require('mongoose');

const NinModificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  modificationType: {
    type: String,
    required: true
  },
  modificationAmount: {
    type: Number,
    default: 0
  },
  newDob: {
    type: String
  },
  newSurname: {
    type: String
  },
  newFirstName: {
    type: String
  },
  newMiddleName: {
    type: String
  },
  newPhoneNo: {
    type: String
  },
  newAddress: {
    type: String
  },
  newGender: {
    type: String
  },
  ninNumber: {
    type: String,
    required: true
  },
  address: {
    type: String
  },
  localGovernment: {
    type: String
  },
  stateOfOrigin: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('NinModification', NinModificationSchema);
