const { body, validationResult } = require('express-validator');
const sanitizeHtml = require('sanitize-html');

// Sanitize middleware for HTML content
const sanitizeContent = (fields) => {
  return (req, res, next) => {
    fields.forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        req.body[field] = sanitizeHtml(req.body[field], {
          allowedTags: [],
          allowedAttributes: {}
        });
      }
    });
    next();
  };
};

// Order validation rules
const validateOrder = [
  body('customerId').isMongoId().withMessage('Invalid customer ID'),
  body('items').isArray().withMessage('Items must be an array'),
  body('items.*.productId').isMongoId().withMessage('Invalid product ID'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('shippingAddress').notEmpty().withMessage('Shipping address is required'),
  sanitizeContent(['notes', 'shippingAddress'])
];

// Shipment validation rules
const validateShipment = [
  body('orderId').isMongoId().withMessage('Invalid order ID'),
  body('carrier').notEmpty().withMessage('Carrier is required'),
  body('trackingNumber').notEmpty().withMessage('Tracking number is required'),
  body('status').isIn(['pending', 'in_transit', 'delivered']).withMessage('Invalid status'),
  sanitizeContent(['notes'])
];

// Authentication validation rules
const validateAuth = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/)
    .withMessage('Password must include uppercase, lowercase, number and special character')
];

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

module.exports = {
  validateOrder,
  validateShipment,
  validateAuth,
  handleValidationErrors,
  sanitizeContent
};