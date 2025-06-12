// controllers/enrollmentController.js
const Enrollment = require("../models/EnrollmentModel");

const createEnrollment = async (req, res) => {
  try {
    const {
      userId,
      enrollmentType,
      amount,
      firstName,
      middleName,
      surname,
      dateOfBirth,
      stateOfOrigin,
      localOfOrigin,
      phoneNumber,
      gender,
      height,
      passport,
    } = req.body;

    const enrollment = new Enrollment({
      userId,
      enrollmentType,
      amount,
      firstName,
      middleName: middleName || "",
      surname,
      dateOfBirth,
      stateOfOrigin,
      localOfOrigin,
      phoneNumber,
      gender,
      height,
      passport, 
    });

    await enrollment.save();

    return res.status(200).json({
      message: "Enrollment saved successfully",
      data: enrollment,
    });
  } catch (error) {
    console.error("Error saving enrollment:", error);
    return res.status(500).json({
      message: "Failed to save enrollment",
    });
  }
};

module.exports = { createEnrollment };
