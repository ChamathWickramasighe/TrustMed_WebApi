const crypto = require('crypto');

const ENCRYPTION_DISABLED = process.env.ENCRYPTION_DISABLED === 'true';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your_fallback_32_character_key_here_';
const ENCRYPTION_IV = process.env.ENCRYPTION_IV || 'your_16_char_iv_';

// Ensure key is 32 bytes (256 bits)
const key = Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32));
// Ensure IV is 16 bytes (128 bits)
const iv = Buffer.from(ENCRYPTION_IV.padEnd(16).slice(0, 16));

/**
 * Encrypt text using AES-256-CBC
 * @param {string} text - Text to encrypt
 * @returns {string} - Encrypted text
 */
const encrypt = (text) => {
  if (!text || ENCRYPTION_DISABLED) return text;
  
  try {
    // For backward compatibility, use the static IV
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return the raw encrypted text without any special format
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    return text;
  }
};

/**
 * Decrypt text using AES-256-CBC
 * @param {string} encryptedText - Text to decrypt
 * @returns {string} - Decrypted text
 */
const decrypt = (encryptedText) => {
  if (!encryptedText || ENCRYPTION_DISABLED) return encryptedText;
  
  try {
    // Simple check if it looks like a hex string (which would be encrypted)
    if (!/^[0-9a-f]+$/i.test(encryptedText)) {
      // If it doesn't look like a hex string, it might not be encrypted
      return encryptedText;
    }
    
    // Use the static IV for decryption (backward compatibility)
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    
    try {
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (finalError) {
      console.error('Error in final decryption step:', finalError);
      return "[Encrypted content]";
    }
  } catch (error) {
    console.error('Decryption error:', error, 'for text:', encryptedText);
    return "[Encrypted content]";
  }
};

/**
 * Check if text is likely to be encrypted
 * @param {string} text - Text to check
 * @returns {boolean} - True if likely encrypted
 */
const isLikelyEncrypted = (text) => {
  if (!text || typeof text !== 'string') return false;
  
  // Check if it's a hex string (which is what our encrypted data looks like)
  return /^[0-9a-f]{32,}$/i.test(text);
};

// Middleware to encrypt sensitive request data
const encryptSensitiveData = (fields) => {
  return (req, res, next) => {
    if (req.body) {
      fields.forEach(field => {
        if (req.body[field]) {
          req.body[field] = encrypt(req.body[field]);
        }
      });
    }
    next();
  };
};

// Middleware to decrypt sensitive response data
const decryptSensitiveData = (fields) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(body) {
      if (body && typeof body === 'string') {
        try {
          const data = JSON.parse(body);
          
          if (data && typeof data === 'object') {
            fields.forEach(field => {
              if (data[field] && isLikelyEncrypted(data[field])) {
                data[field] = decrypt(data[field]);
              }
              
              // Handle arrays of objects
              if (data.data && Array.isArray(data.data)) {
                data.data.forEach(item => {
                  if (item && item[field] && isLikelyEncrypted(item[field])) {
                    item[field] = decrypt(item[field]);
                  }
                });
              }
            });
            
            body = JSON.stringify(data);
          }
        } catch (error) {
          console.error('Error decrypting response:', error);
        }
      }
      
      return originalSend.call(this, body);
    };
    
    next();
  };
};

module.exports = {
  encrypt,
  decrypt,
  isLikelyEncrypted,
  encryptSensitiveData,
  decryptSensitiveData
};