const mongoose = require("mongoose");
const argon2 = require("argon2");
const crypto = require("crypto");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, "Invalid email"],
    },
    password: { type: String, required: true, minlength: 6, select: false },

    // verification & password reset
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String }, // stored hashed
    verificationExpires: { type: Date },

    resetPasswordToken: { type: String }, // stored hashed
    resetPasswordExpires: { type: Date },

    // brute force / lockout
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

// Hash password with argon2 before save
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    this.password = await argon2.hash(this.password);
    next();
  } catch (err) {
    next(err);
  }
});

// Verify password with argon2
UserSchema.methods.matchPassword = async function (enteredPassword) {
  try {
    return await argon2.verify(this.password, enteredPassword);
  } catch {
    return false;
  }
};

UserSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

UserSchema.methods.incrementLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    this.loginAttempts = 1;
    this.lockUntil = null;
  } else {
    this.loginAttempts += 1;
    if (this.loginAttempts >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
      this.lockUntil = Date.now() + LOCK_TIME;
    }
  }
  await this.save();
};

UserSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lockUntil = null;
  await this.save();
};

UserSchema.methods.setVerificationToken = function (rawToken, expiresInMs) {
  this.verificationToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");
  this.verificationExpires = Date.now() + expiresInMs;
};

UserSchema.methods.setResetPasswordToken = function (rawToken, expiresInMs) {
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");
  this.resetPasswordExpires = Date.now() + expiresInMs;
};

module.exports = mongoose.model("User", UserSchema);
