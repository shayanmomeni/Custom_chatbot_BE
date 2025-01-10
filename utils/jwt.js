const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET;
const jwtExpirySeconds = process.env.JWT_EXPIRY_SECONDS;

const generateToken = (payload) => {
  return jwt.sign(payload, jwtSecret, {
    algorithm: 'HS256',
    expiresIn: parseInt(jwtExpirySeconds) || jwtExpirySeconds,
  });
};

module.exports = { generateToken };
