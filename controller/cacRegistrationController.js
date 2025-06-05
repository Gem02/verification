const CacRegistration = require('../models/cacRegistrationModel');

const registerCAC = async (req, res) => {
  try {
    const {
      userId,
      registrationType,
      surname,
      firstName,
      otherName,
      dateOfBirth,
      gender,
      phoneNumber,
      homeAddress,
      officeAddress,
      natureOfBusiness,
      businessName1,
      businessName2,
      bvnNumber,
      ninNumber,
      passport,
      email,
      stateOfOrigin,
      localGovtOrigin,
      signature
    } = req.body;


    const newRegistration = new CacRegistration({
      userId,
      registrationType,
      surname,
      firstName,
      otherName,
      dateOfBirth,
      gender,
      phoneNumber,
      homeAddress,
      officeAddress,
      natureOfBusiness,
      businessName1,
      businessName2,
      bvnNumber,
      ninNumber,
      passport,
      email,
      stateOfOrigin,
      localGovtOrigin,
      signature
    });

    await newRegistration.save();
    res.status(200).json({ message: 'Registration saved successfully', data: newRegistration });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};
 
module.exports = registerCAC;