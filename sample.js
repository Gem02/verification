// utils/encryption.js
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY.slice(0, 32); // Must be 32 bytes
const IV_LENGTH = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  const [ivHex, encryptedData] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { encrypt, decrypt };


// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { encrypt, decrypt } = require('../utils/encryption');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'], required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  address: { type: String },
  nationality: { type: String },
  stateOfOrigin: { type: String },
  lga: { type: String },
  profilePhoto: { type: String }, // Store the URL or path to the uploaded photo
  nextOfKin: {
    name: { type: String },
    phone: { type: String },
    relationship: { type: String }
  },
  bankDetails: {
    bankName: { type: String },
    accountNumber: { type: String, set: encrypt, get: decrypt },
    accountName: { type: String }
  },
  nin: { type: String, set: encrypt, get: decrypt },
  bvn: { type: String, set: encrypt, get: decrypt },
  role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },
  isVerified: { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);




















// utils/encryption.js
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY.slice(0, 32); // Must be 32 bytes
const IV_LENGTH = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  const [ivHex, encryptedData] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { encrypt, decrypt };


// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { encrypt, decrypt } = require('../utils/encryption');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'], required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  address: { type: String },
  nationality: { type: String },
  stateOfOrigin: { type: String },
  lga: { type: String },
  profilePhoto: { type: String },
  nextOfKin: {
    name: { type: String },
    phone: { type: String },
    relationship: { type: String }
  },
  bankDetails: {
    bankName: { type: String },
    accountNumber: { type: String, set: encrypt, get: decrypt },
    accountName: { type: String }
  },
  nin: { type: String, set: encrypt, get: decrypt },
  bvn: { type: String, set: encrypt, get: decrypt },
  role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },
  isVerified: { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);


// models/Wallet.js
const walletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  balance: { type: Number, default: 0 },
  currency: { type: String, default: 'NGN' }
}, { timestamps: true });

module.exports = mongoose.model('Wallet', walletSchema);


// models/Referral.js
const referralSchema = new mongoose.Schema({
  referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  referredUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rewardEarned: { type: Number, default: 0 },
  referredAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Referral', referralSchema);


// models/Loan.js
const loanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'declined'], default: 'pending' },
  repaymentType: { type: String, enum: ['flexible', 'monthly'], required: true },
  requestedAt: { type: Date, default: Date.now },
  approvedAt: { type: Date },
  dueDate: { type: Date },
  guarantor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Loan', loanSchema);


// models/SavingsPlan.js
const savingsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  principal: { type: Number, required: true },
  interestRate: { type: Number, default: 3.5 },
  startDate: { type: Date, default: Date.now },
  lockInPeriodMonths: { type: Number, default: 12 },
  nextInterestWithdrawal: { type: Date },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('SavingsPlan', savingsSchema);


// models/InvestmentPlan.js
const investmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: { type: Number, required: true },
  interestRate: { type: Number },
  dividendEligible: { type: Boolean, default: true },
  startedAt: { type: Date, default: Date.now },
  lockedUntil: { type: Date },
  withdrawals: [{
    atMonth: { type: Number },
    allowed: { type: Boolean, default: false },
    withdrawn: { type: Boolean, default: false },
    dateWithdrawn: { type: Date }
  }]
}, { timestamps: true });

module.exports = mongoose.model('InvestmentPlan', investmentSchema);


// models/TransactionHistory.js
const transactionHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['deposit', 'withdrawal', 'loan', 'investment', 'referral'], required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'successful', 'failed'], default: 'pending' },
  reference: { type: String },
  meta: { type: Object },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TransactionHistory', transactionHistorySchema);
