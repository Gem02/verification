const NinModification = require('../models/NinModificationModel');

const requestNinModification = async (req, res) => {
  try {
    const {
      userId,
      modificationType,
      modificationAmount,
      newDob,
      newSurname,
      newFirstName,
      newMiddleName,
      newPhoneNo,
      newAddress,
      newGender,
      ninNumber,
      address,
      localGovernment,
      stateOfOrigin
    } = req.body;

    if (!userId || !ninNumber) {
      return res.status(400).json({ message: 'userId and NIN number are required.' });
    }

    const modificationRequest = new NinModification({
      userId,
      modificationType,
      modificationAmount,
      newDob,
      newSurname,
      newFirstName,
      newMiddleName,
      newPhoneNo,
      newAddress,
      newGender,
      ninNumber,
      address,
      localGovernment,
      stateOfOrigin
    });

    await modificationRequest.save();

    return res.status(201).json({
      message: 'NIN modification request submitted successfully.',
      data: modificationRequest
    });

  } catch (error) {
    console.error('NIN modification error:', error.message);
    return res.status(500).json({ message: 'Server error. Could not submit modification request.' });
  }
};

module.exports = { requestNinModification };
