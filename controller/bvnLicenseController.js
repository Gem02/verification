const BvnLicenseSubmission = require('../models/BvnLicenseModel');

const submitBvnLicense = async (req, res) => {
  try {
    const payload = req.body;

    const submission = new BvnLicenseSubmission(payload);
    await submission.save();

    res.status(200).json({ message: 'BVN licensing submitted successfully' });
  } catch (error) {
    console.error(' Error saving BVN licensing:', error);
    res.status(500).json({ error: 'Failed to save BVN licensing' });
  }
};

module.exports = { submitBvnLicense };
