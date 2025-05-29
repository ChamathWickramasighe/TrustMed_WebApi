const { encrypt, decrypt } = require('../middleware/encryption.middleware');

/**
 * Encrypt a payload object
 * @param {Object} payload - The data to encrypt
 * @param {Array} sensitiveFields - Fields to encrypt
 * @returns {Object} - Object with encrypted sensitive fields
 */
const encryptPayload = (payload, sensitiveFields) => {
  if (!payload) return payload;

  const encryptedPayload = { ...payload };
  
  sensitiveFields.forEach(field => {
    if (encryptedPayload[field]) {
      encryptedPayload[field] = encrypt(
        typeof encryptedPayload[field] === 'string' 
          ? encryptedPayload[field] 
          : JSON.stringify(encryptedPayload[field])
      );
    }
  });
  
  return encryptedPayload;
};

/**
 * Decrypt a payload object
 * @param {Object} payload - The data to decrypt
 * @param {Array} sensitiveFields - Fields to decrypt
 * @returns {Object} - Object with decrypted sensitive fields
 */
const decryptPayload = (payload, sensitiveFields) => {
  if (!payload) return payload;

  const decryptedPayload = { ...payload };
  
  sensitiveFields.forEach(field => {
    if (decryptedPayload[field]) {
      const decrypted = decrypt(decryptedPayload[field]);
      
      try {
        decryptedPayload[field] = JSON.parse(decrypted);
      } catch (error) {
        decryptedPayload[field] = decrypted;
      }
    }
  });
  
  return decryptedPayload;
};

module.exports = {
  encryptPayload,
  decryptPayload
};