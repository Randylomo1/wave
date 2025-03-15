require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const winston = require('winston');
const Redis = require('redis');
const http = require('http');
const socketIO = require('socket.io');
const { promisify } = require('util');
const queue = require('bull');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
  }
});

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Redis client setup with retry strategy
const redisClient = Redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  retry_strategy: function(options) {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      logger.error('Redis connection refused. Retrying...');
      return Math.min(options.attempt * 100, 3000);
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      logger.error('Redis retry time exhausted');
      return new Error('Redis retry time exhausted');
    }
    if (options.attempt > 10) {
      logger.error('Redis maximum retries reached');
      return new Error('Redis maximum retries reached');
    }
    return Math.min(options.attempt * 100, 3000);
  }
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error', err);
});

redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

redisClient.on('ready', () => {
  logger.info('Redis client ready');
});

redisClient.on('reconnecting', () => {
  logger.info('Redis client reconnecting');
});

// Promisify Redis methods
const redisAsync = {
  get: promisify(redisClient.get).bind(redisClient),
  set: promisify(redisClient.set).bind(redisClient),
  del: promisify(redisClient.del).bind(redisClient),
  setex: promisify(redisClient.setex).bind(redisClient)
};

// Export Redis async methods
module.exports.redisAsync = redisAsync;

// Create job queues
const orderQueue = new queue('orderProcessing', {
  redis: { host: process.env.REDIS_HOST, port: process.env.REDIS_PORT }
});

const shipmentQueue = new queue('shipmentProcessing', {
  redis: { host: process.env.REDIS_HOST, port: process.env.REDIS_PORT }
});

// Rate limiting configuration
const createLimiter = (windowMs, max, prefix) => rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: prefix
  }),
  windowMs: windowMs,
  max: max
});

const apiLimiter = createLimiter(process.env.RATE_LIMIT_WINDOW_MS, process.env.RATE_LIMIT_MAX_REQUESTS, 'rl:api:');
const authLimiter = createLimiter(300000, 5, 'rl:auth:');
const orderLimiter = createLimiter(600000, 50, 'rl:order:');

// Request batching middleware with improved error handling
const batchRequests = async (req, res, next) => {
  if (req.headers['x-batch-request'] === 'true') {
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ 
        error: 'Invalid batch request format',
        details: 'Request body must be an array'
      });
    }

    if (req.body.length > 10) {
      return res.status(400).json({
        error: 'Batch size exceeded',
        details: 'Maximum 10 requests per batch allowed'
      });
    }

    try {
      const results = await Promise.all(
        req.body.map(async (request, index) => {
          try {
            const batchReq = { 
              ...req, 
              body: request,
              originalUrl: req.originalUrl,
              batchIndex: index
            };
            const batchRes = { 
              status: null, 
              json: null,
              headers: {}
            };

            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error('Request timeout'));
              }, 30000); // 30 second timeout

              res.status = (code) => {
                batchRes.status = code;
                return res;
              };
              res.json = (data) => {
                batchRes.json = data;
                clearTimeout(timeout);
                resolve();
              };
              res.set = (key, value) => {
                batchRes.headers[key] = value;
                return res;
              };

              next(batchReq, res);
            });

            return { 
              status: batchRes.status, 
              data: batchRes.json,
              headers: batchRes.headers
            };
          } catch (err) {
            logger.error(`Batch request ${index} failed:`, err);
            return { 
              status: 500, 
              error: 'Request processing failed',
              details: err.message
            };
          }
        })
      );

      return res.json({
        success: true,
        results,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Batch processing failed:', error);
      return res.status(500).json({ 
        error: 'Batch processing failed',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  next();
};

// Middleware
// Import validation middleware
const { validateOrder, validateShipment, validateAuth, handleValidationErrors } = require('./middleware/validation');

// Security and parsing middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting middleware
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/orders', orderLimiter);

// Request batching and validation middleware
app.use(batchRequests);
app.use(handleValidationErrors);

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => logger.info('Connected to MongoDB'))
  .catch((err) => logger.error('MongoDB connection error:', err));

// Make io available to routes
app.set('io', io);

// Import routes
const { router: authRouter } = require('./routes/auth');
const ordersRouter = require('./routes/orders');
const shipmentsRouter = require('./routes/shipments');
const inventoryRouter = require('./routes/inventory');

// Route middleware
app.use('/api/auth', authRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/shipments', shipmentsRouter);
app.use('/api/inventory', inventoryRouter);

// Serve static files
app.use(express.static('public'));

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.info('New WebSocket connection');
  
  socket.on('disconnect', () => {
    logger.info('Client disconnected');
  });

  // Join order tracking room
  socket.on('trackOrder', (orderId) => {
    socket.join(`order_${orderId}`);
  });

  // Leave order tracking room
  socket.on('untrackOrder', (orderId) => {
    socket.leave(`order_${orderId}`);
  });
});

// Error handling middleware
// Global error handling middleware
app.use((err, req, res, next) => {
  // Log error details
  logger.error('Unhandled Error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    user: req.user ? req.user.id : 'anonymous'
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Authentication Error',
      details: 'Invalid token provided'
    });
  }

  if (err.name === 'MongoError' && err.code === 11000) {
    return res.status(409).json({
      error: 'Conflict Error',
      details: 'Duplicate entry found'
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    requestId: req.id,
    timestamp: new Date().toISOString()
  });

  // Ensure connection cleanup on fatal errors
  if (err.fatal) {
    logger.error('Fatal error occurred, cleaning up connections...');
    redisClient.quit();
    mongoose.connection.close();
    process.exit(1);
  }
  logger.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});