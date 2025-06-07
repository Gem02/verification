
const BvnSubmission = require('../models/BvnSubmissionModel');

const submitBvnData = async (req, res) => {
  try {
    const payload = req.body;

    const submission = new BvnSubmission(payload);
    await submission.save();

    res.status(200).json({ message: 'BVN data submitted successfully' });
  } catch (error) {
    console.error('❌ Error saving BVN submission:', error);
    res.status(500).json({ error: 'Something went wrong while saving BVN data' });
  }
};

module.exports = { submitBvnData };
