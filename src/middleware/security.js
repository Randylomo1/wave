const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('redis');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Redis client for rate limiting and caching with retry strategy
const redisClient = Redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  retry_strategy: function(options) {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      console.error('Redis connection refused. Retrying...');
      return Math.min(options.attempt * 100, 3000);
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Redis retry time exhausted');
    }
    if (options.attempt > 10) {
      return new Error('Redis maximum retries reached');
    }
    return Math.min(options.attempt * 100, 3000);
  }
});

// Handle Redis connection events
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('Redis client connected');
});

redisClient.on('ready', () => {
  console.log('Redis client ready');
});

redisClient.on('reconnecting', () => {
  console.log('Redis client reconnecting');
});

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Rate limiting middleware
const createRateLimiter = (windowMs, max, prefix) => rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: prefix
  }),
  windowMs,
  max,
  message: { error: 'Too many requests, please try again later.' }
});

// Authentication rate limiter
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'rl:auth:'
);

// API rate limiter
const apiLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  100, // 100 requests
  'rl:api:'
);

// Verify JWT token middleware
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // Check token in Redis blacklist
    const isBlacklisted = await redisClient.get(`bl:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ message: 'Token has been invalidated' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Email verification middleware
const sendVerificationEmail = async (user) => {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  await redisClient.set(
    `verify:${user._id}`,
    verificationToken,
    'EX',
    24 * 60 * 60 // 24 hours expiration
  );

  const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}&userId=${user._id}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: user.email,
    subject: 'Verify your email address',
    html: `
      <h1>Email Verification</h1>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
      <p>This link will expire in 24 hours.</p>
    `
  });
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  res.set({
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Content-Security-Policy': "default-src 'self'"
  });
  next();
};

module.exports = {
  authLimiter,
  apiLimiter,
  verifyToken,
  sendVerificationEmail,
  securityHeaders
};