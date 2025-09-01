const crypto = require("crypto");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");

const cron = require("node-cron");
const admin = require("../utils/firebase");

const {
  generateAccessToken,
  createRefreshToken,
  generateRandomToken,
} = require("../utils/Token");
const { sendEmail } = require("../utils/email");

// Helpers to set refresh cookie
const setRefreshTokenCookie = require("../utils/refreshTokenCookie");

// Register
exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { name, email, password } = req.body;

  try {
    const exists = await User.findOne({ email });
    if (exists)
      return res
        .status(400)
        .json({ success: false, error: "Email already registered" });

    const user = await User.create({ name, email, password });

    // Generate short verification code instead of URL
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    user.setVerificationToken(verificationCode, 24 * 60 * 60 * 1000);
    await user.save();

    // Email the code to the user
    await sendEmail({
      to: user.email,
      subject: "Verify your email",
      text: `Your verification code is: ${verificationCode}`,
      html: `<p>Your verification code is:</p>
<div style="background-color: #f0f0f0; 
            padding: 10px; 
            display: inline-block; 
            font-size: 18px; 
            font-weight: bold; 
            font-family: Arial, sans-serif; 
            border-radius: 5px;">
  ${verificationCode}
</div>`,
    });

    res.status(201).json({
      success: true,
      message:
        "Registered successfully. Check your email for the verification code.",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Verify email
exports.verifyEmail = async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res
      .status(400)
      .json({ success: false, error: "Verification code is required" });
  }

  const hashed = crypto.createHash("sha256").update(code).digest("hex");

  try {
    const user = await User.findOne({
      verificationToken: hashed,
      verificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired verification code",
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Email verified successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Login
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { email, password, fcmToken } = req.body;
  console.log(fcmToken);
  try {
    const user = await User.findOne({ email }).select("+password");

    console.log(user);
    if (!user)
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });

    if (user.isVerified === false) {
      return res.status(401).json({
        success: false,
        error: "Unverified Email please verify to continue ",
      });
    }

    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        error: "Account locked due to many failed attempts. Try later.",
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      await user.incrementLoginAttempts();
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });
    }

    // successful login
    await user.resetLoginAttempts();

    // issue tokens
    if (!user.fcmTokens.includes(fcmToken)) {
      user.fcmTokens.push(fcmToken);
      user.save();
    }
    const accessToken = generateAccessToken(user);
    const { rawToken, dbToken } = await createRefreshToken(user, req.ip);
    setRefreshTokenCookie(res, rawToken);

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
      },
      token: accessToken,
      expiresIn: process.env.JWT_EXPIRES || "15m",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Refresh tokens (rotation)
exports.refreshToken = async (req, res) => {
  try {
    const cookieName = process.env.REFRESH_TOKEN_COOKIE_NAME || "refreshToken";
    const rawToken = req.cookies[cookieName] || req.body.refreshToken;
    if (!rawToken)
      return res
        .status(401)
        .json({ success: false, error: "No refresh token provided" });

    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    const dbToken = await RefreshToken.findOne({ token: tokenHash }).populate(
      "user"
    );
    if (!dbToken || !dbToken.isActive)
      return res.status(401).json({ success: false, error: "Invalid token" });

    // rotate: revoke current and issue a new one
    dbToken.revoked = true;
    dbToken.revokedAt = Date.now();

    const { rawToken: newRawToken, dbToken: newDbToken } =
      await createRefreshToken(dbToken.user, req.ip);
    dbToken.replacedByToken = newDbToken._id.toString();
    await dbToken.save();

    setRefreshTokenCookie(res, newRawToken);

    // issue new access token
    const accessToken = generateAccessToken(dbToken.user);
    res.status(200).json({
      success: true,
      token: accessToken,
      expiresIn: process.env.JWT_EXPIRES || "15m",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Logout (revoke refresh token)
exports.logout = async (req, res) => {
  try {
    const cookieName = process.env.REFRESH_TOKEN_COOKIE_NAME || "refreshToken";
    const rawToken = req.cookies[cookieName] || req.body.refreshToken;

    const { email, fcmToken } = req.body;
    console.log(email);
    console.log(fcmToken);

    await User.updateOne({ email }, { $pull: { fcmTokens: fcmToken } });

    if (!rawToken) {
      res.clearCookie(cookieName);
      return res.status(200).json({ success: true, message: "Logged out" });
    }
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    const dbToken = await RefreshToken.findOne({ token: tokenHash });
    if (dbToken) {
      dbToken.revoked = true;
      dbToken.revokedAt = Date.now();
      await dbToken.save();
    }
    res.clearCookie(cookieName);

    res.status(200).json({ success: true, message: "Logged out" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Forgot password (send reset link)// Forgot password (return reset token directly, explicit error if email not found)
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: "Invalid request URL or email not found",
      });
    }

    const resetRaw = generateRandomToken(20); // e.g., crypto.randomBytes(20).toString("hex")
    user.setResetPasswordToken(resetRaw, 60 * 60 * 1000); // 1 hour expiry
    await user.save();

    // Returning token in JSON instead of sending email
    res.status(200).json({
      success: true,
      message: "Use this token to reset your password",
      resetToken: resetRaw,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// Reset password using token in Authorization header
exports.resetPassword = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(400)
        .json({ success: false, error: "Reset token missing" });
    }

    const rawToken = authHeader.split(" ")[1];
    const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");

    const { password } = req.body;
    if (!password || password.trim().length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password is required and must be at least 6 characters long",
      });
    }

    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid or expired token" });
    }

    user.password = password; // Assuming pre-save hook hashes it with argon2
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
