import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import jwtDecode from 'jwt-decode';
import { Buffer } from 'buffer';
import rateLimit from 'express-rate-limit';
import { validationResult } from 'express-validator';
import helmet from 'helmet';
import xss from 'xss-clean';
import mongoSanitize from 'express-mongo-sanitize';

// Biometric authentication
export const authenticateWithBiometrics = async () => {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) {
      throw new Error('Biometric authentication not available');
    }

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) {
      throw new Error('No biometrics enrolled');
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to continue',
      disableDeviceFallback: true,
      cancelLabel: 'Cancel'
    });

    return result.success;
  } catch (error) {
    console.error('Biometric auth error:', error);
    return false;
  }
};

// Secure key storage
export const secureStorage = {
  async store(key, value) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('Secure storage error:', error);
      throw error;
    }
  },

  async retrieve(key) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Secure retrieval error:', error);
      throw error;
    }
  },

  async remove(key) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Secure deletion error:', error);
      throw error;
    }
  }
};

// Device security check
export const checkDeviceSecurity = async () => {
  try {
    const isJailBroken = __DEV__ ? false : await Device.isRootedExperimentalAsync();
    if (isJailBroken) {
      throw new Error('Device security compromised');
    }

    // App integrity check
    const appIntegrity = await Application.getInstallReferrerAsync();
    const isValidInstall = appIntegrity.installReferrer === 'com.android.vending' || 
                          Platform.OS === 'ios';
    if (!isValidInstall && !__DEV__) {
      throw new Error('Invalid app installation source');
    }

    return true;
  } catch (error) {
    console.error('Security check failed:', error);
    return false;
  }
};

// Encryption utilities
export const encryption = {
  async encrypt(text, key) {
    try {
      const iv = await Crypto.getRandomBytesAsync(16);
      const salt = await Crypto.getRandomBytesAsync(16);
      const derivedKey = await this.deriveKey(key, salt);
      
      const cipher = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        text + derivedKey
      );
      
      return {
        encrypted: cipher,
        iv: Buffer.from(iv).toString('base64'),
        salt: Buffer.from(salt).toString('base64')
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw error;
    }
  },

  async decrypt(encryptedData, key) {
    try {
      const { encrypted, iv, salt } = encryptedData;
      const derivedKey = await this.deriveKey(key, Buffer.from(salt, 'base64'));
      
      const decipher = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        encrypted + derivedKey
      );
      
      return decipher;
    } catch (error) {
      console.error('Decryption error:', error);
      throw error;
    }
  },

  async deriveKey(password, salt) {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password + Buffer.from(salt).toString('base64')
    );
  }
};

// Rate limiting configuration
export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

// Request validation middleware
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Security headers middleware using helmet
export const securityHeaders = helmet();

// XSS protection middleware
export const xssProtection = xss();

// MongoDB query sanitization
export const sanitizeData = mongoSanitize();

// Token verification middleware
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Error handling middleware
export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};