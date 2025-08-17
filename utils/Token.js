const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const RefreshToken = require("../models/RefreshToken");

const generateAccessToken = (user) => {
  return jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "5d", // 5 days validity
  });
};

const generateRandomToken = (size = 40) => {
  return crypto.randomBytes(size).toString("hex");
};

// create & persist refresh token (hashed) and return raw token
const createRefreshToken = async (user, ipAddress) => {
  const rawToken = generateRandomToken(32);
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const days = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || "30", 10);
  const expires = Date.now() + days * 24 * 60 * 60 * 1000;

  const refreshToken = await RefreshToken.create({
    user: user._id,
    token: tokenHash,
    expires,
    createdByIp: ipAddress,
  });

  return { rawToken, dbToken: refreshToken };
};

module.exports = {
  generateAccessToken,
  createRefreshToken,
  generateRandomToken,
};
