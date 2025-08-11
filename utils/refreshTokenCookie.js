// helpers/setRefreshTokenCookie.js
const setRefreshTokenCookie = (res, token) => {
  const cookieName = process.env.REFRESH_TOKEN_COOKIE_NAME || "refreshToken";

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: process.env.COOKIE_SAME_SITE || "lax",
    maxAge:
      parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || "30", 10) *
      24 *
      60 *
      60 *
      1000, // convert days to milliseconds
  };

  res.cookie(cookieName, token, cookieOpts);
};

module.exports = setRefreshTokenCookie;
