const { pool } = require('../config/database');
const { encrypt, decrypt } = require('../middleware/encryption.middleware');
const bcrypt = require('bcrypt');

// Fields that should be encrypted/decrypted
const sensitiveFields = ['address'];

/**
 * Create a new insurance company
 * @param {Object} insuranceData - Insurance company data
 * @returns {Promise<Object>} - The created insurance company
 */
const createInsurance = async (insuranceData) => {
  // Hash password
  const hashedPassword = await bcrypt.hash(insuranceData.password, 10);
  
  // Encrypt sensitive fields
  const encryptedAddress = encrypt(insuranceData.address);
  
  // Generate company ID
  const companyId = `IN${Date.now().toString().slice(-6)}`;

  await pool.query(
    `INSERT INTO users (id, email, password, role, created_at)
     VALUES (?, ?, ?, 'insurance', NOW())`,
    [companyId, insuranceData.email, hashedPassword]
  );
  
  const [result] = await pool.query(
    `INSERT INTO insurance_companies (
      company_id, company_name, company_type, website, hotline,
      email, address, city, district, postal_code, description,
      password, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      companyId,
      insuranceData.company_name,
      insuranceData.company_type || null,
      insuranceData.website || null,
      insuranceData.hotline,
      insuranceData.email,
      encryptedAddress,
      insuranceData.city,
      insuranceData.district,
      insuranceData.postal_code,
      insuranceData.description || null,
      hashedPassword
    ]
  );
  
  // Return created insurance company (without password)
  return getInsuranceById(companyId);
};

/**
 * Get all insurance companies
 * @param {Object} options - Query options (search, limit, offset)
 * @returns {Promise<Array>} - Array of insurance companies
 */
const getAllInsurance = async (options = { search: '', limit: 10, offset: 0 }) => {
  let query = `
    SELECT company_id, company_name, company_type, website, hotline,
    email, city, district, postal_code, description, created_at
    FROM insurance_companies
  `;
  
  const queryParams = [];
  
  if (options.search) {
    query += `
      WHERE company_name LIKE ? OR email LIKE ? OR hotline LIKE ? 
      OR company_type LIKE ?
    `;
    const searchTerm = `%${options.search}%`;
    queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  queryParams.push(options.limit, options.offset);
  
  const [rows] = await pool.query(query, queryParams);
  
  return rows;
};

/**
 * Get an insurance company by ID
 * @param {string} id - Company ID
 * @param {boolean} [keepPassword=false] - Whether to keep the password in the returned object
 * @returns {Promise<Object|null>} - Insurance company or null if not found
 */
const getInsuranceById = async (id, keepPassword = false) => {
    const [rows] = await pool.query(
        'SELECT * FROM insurance_companies WHERE company_id = ?',
        [id]
      );
      
      if (rows.length === 0) {
        return null;
      }
      
      const insurance = rows[0];
      
      // Decrypt sensitive fields
      sensitiveFields.forEach(field => {
        if (insurance[field]) {
          insurance[field] = decrypt(insurance[field]);
        }
      });
      
      // Remove password only if not needed
      if (!keepPassword) {
        delete insurance.password;
      }
      
      return insurance;
    };

/**
 * Update an insurance company
 * @param {string} id - Company ID
 * @param {Object} insuranceData - Updated insurance data
 * @returns {Promise<Object>} - Updated insurance company
 */
const updateInsurance = async (id, insuranceData) => {
  // Get current insurance data
  const [currentInsurance] = await pool.query(
    'SELECT * FROM insurance_companies WHERE company_id = ?',
    [id]
  );
  
  if (currentInsurance.length === 0) {
    throw new Error('Insurance company not found');
  }
  
  // Create updated insurance object
  const updatedInsurance = { ...currentInsurance[0], ...insuranceData };
  
  // Encrypt sensitive fields if they were updated
  sensitiveFields.forEach(field => {
    if (insuranceData[field]) {
      updatedInsurance[field] = encrypt(insuranceData[field]);
    }
  });
  
  // Hash password if it was updated
  if (insuranceData.password) {
    updatedInsurance.password = await bcrypt.hash(insuranceData.password, 10);
    
    // Also update the user table password
    await pool.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [updatedInsurance.password, id]
    );
  }
  
  // Update the insurance record
  await pool.query(
    `UPDATE insurance_companies SET 
      company_name = ?, company_type = ?, website = ?, hotline = ?,
      email = ?, address = ?, city = ?, district = ?, postal_code = ?,
      description = ?, password = ?
    WHERE company_id = ?`,
    [
      updatedInsurance.company_name,
      updatedInsurance.company_type,
      updatedInsurance.website,
      updatedInsurance.hotline,
      updatedInsurance.email,
      updatedInsurance.address,
      updatedInsurance.city,
      updatedInsurance.district,
      updatedInsurance.postal_code,
      updatedInsurance.description,
      updatedInsurance.password,
      id
    ]
  );
  
  // Update user email if it changed
  if (insuranceData.email && insuranceData.email !== currentInsurance[0].email) {
    await pool.query(
      'UPDATE users SET email = ? WHERE id = ?',
      [insuranceData.email, id]
    );
  }
  
  // Get the updated insurance company
  return getInsuranceById(id);
};

/**
 * Delete an insurance company
 * @param {string} id - Company ID
 * @returns {Promise<boolean>} - True if successfully deleted
 */
const deleteInsurance = async (id) => {
  // Delete from users table first (foreign key constraint)
  await pool.query('DELETE FROM users WHERE id = ?', [id]);
  
  // Then delete from insurance_companies table
  const [result] = await pool.query(
    'DELETE FROM insurance_companies WHERE company_id = ?',
    [id]
  );
  
  return result.affectedRows > 0;
};

/**
 * Find insurance company by email
 * @param {string} email - Insurance company email
 * @returns {Promise<Object|null>} - Insurance company or null if not found
 */
const findInsuranceByEmail = async (email) => {
  const [rows] = await pool.query(
    'SELECT * FROM insurance_companies WHERE email = ?',
    [email]
  );
  
  if (rows.length === 0) {
    return null;
  }
  
  const insurance = rows[0];
  
  // Decrypt sensitive fields
  sensitiveFields.forEach(field => {
    if (insurance[field]) {
      insurance[field] = decrypt(insurance[field]);
    }
  });
  
  return insurance;
};

module.exports = {
  createInsurance,
  getAllInsurance,
  getInsuranceById,
  updateInsurance,
  deleteInsurance,
  findInsuranceByEmail
};