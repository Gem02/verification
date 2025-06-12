const express = require("express");
const router = express.Router();
const { createEnrollment } = require("../controller/enrollmentController");

router.post("/register", createEnrollment);

module.exports = router;
