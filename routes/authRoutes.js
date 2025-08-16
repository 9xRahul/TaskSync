const express = require("express");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
} = require("../controllers/AuthControllers");

const {
  validateName,
  validateEmail,
  validatePassword,
} = require("../utils/validators");

const router = express.Router();
router.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 60000,
  max: 5,
  message: {
    success: false,
    error: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  "/register",
  authLimiter,
  [validateName(), validateEmail(), validatePassword()],
  register
);

router.post("/login", authLimiter, validateEmail(), validatePassword(), login);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);
router.post("/forgot-password", authLimiter, [validateEmail()], forgotPassword);
router.post("/reset-password", [validatePassword()], resetPassword);
router.post("/verify-email", verifyEmail);

module.exports = router;
