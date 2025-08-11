const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer "))
    token = authHeader.split(" ")[1];

  if (!token)
    return res
      .status(401)
      .json({ success: false, error: "No token, authorization denied" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // attach user id to req.user (don't fetch entire user unless needed)
    req.user = { id: decoded.id, email: decoded.email };
    // optional: get user from DB if you need more fields:
    // req.userDoc = await User.findById(decoded.id).select("-password");
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, error: "Token is not valid" });
  }
};

module.exports = { authMiddleware };
