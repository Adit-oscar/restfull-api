const express = require("express");
const {
  googleAuth,
  googleCallback,
  register,
  login,
  checkAvailability,
} = require("../controllers/auth");
const router = express.Router();

router.get("/google", googleAuth);
router.get("/google/callback", googleCallback);
router.post("/check-availability", checkAvailability);
router.post("/register", register);
router.post("/login", login);

module.exports = router;
