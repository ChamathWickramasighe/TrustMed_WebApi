const { pool } = require('../config/database');
const { encrypt, decrypt } = require('../middleware/encryption.middleware');
const bcrypt = require('bcrypt');

// Fields that should be encrypted/decrypted
const sensitiveFields = ['nic', 'address'];

/**
 * Create a new staff member
 * @param {Object} staffData - Staff member data
 * @returns {Promise<Object>} - The created staff member
 */
// Update this in staff.model.js
const createStaff = async (staffData) => {
    // Hash password
    const hashedPassword = await bcrypt.hash(staffData.password, 10);
    
    // Encrypt sensitive fields
    const encryptedNIC = encrypt(staffData.nic);
    const encryptedAddress = encrypt(staffData.address);
    
    // Generate staff ID
    const staffId = `ST${Date.now().toString().slice(-6)}`;
    
    // Format date of birth if it exists
    let formattedDateOfBirth = null;
    if (staffData.date_of_birth) {
      // Convert to YYYY-MM-DD format
      const date = new Date(staffData.date_of_birth);
      formattedDateOfBirth = date.toISOString().split('T')[0];
    }
    
    await pool.query(
      `INSERT INTO users (id, email, password, role, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [staffId, staffData.email, hashedPassword, staffData.role]
    );
    
    const [result] = await pool.query(
      `INSERT INTO staff (
        staff_id, first_name, last_name, email, mobile, role, 
        specialization, address, city, district, gender, 
        date_of_birth, nic, profile_picture, password, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        staffId,
        staffData.first_name,
        staffData.last_name,
        staffData.email,
        staffData.mobile,
        staffData.role,
        staffData.specialization || null,
        encryptedAddress,
        staffData.city,
        staffData.district,
        staffData.gender || null,
        formattedDateOfBirth, // Use formatted date
        encryptedNIC,
        staffData.profile_picture || null,
        hashedPassword
      ]
    );
    
    // Return created staff (without password)
    const [staff] = await pool.query(
      'SELECT * FROM staff WHERE staff_id = ?',
      [staffId]
    );
    
    if (staff.length === 0) {
      throw new Error('Failed to create staff member');
    }
    
    // Decrypt sensitive fields
    const staffMember = staff[0];
    staffMember.nic = decrypt(staffMember.nic);
    staffMember.address = decrypt(staffMember.address);
    
    // Remove password
    delete staffMember.password;
    
    return staffMember;
};

/**
 * Get all staff members
 * @param {Object} options - Query options (search, limit, offset)
 * @returns {Promise<Array>} - Array of staff members
 */
const getAllStaff = async (options = { search: '', limit: 10, offset: 0 }) => {
  let query = `
    SELECT staff_id, first_name, last_name, email, mobile, role, 
    specialization, city, district, gender, date_of_birth, 
    profile_picture, created_at
    FROM staff
  `;
  
  const queryParams = [];
  
  if (options.search) {
    query += `
      WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? 
      OR mobile LIKE ? OR role LIKE ?
    `;
    const searchTerm = `%${options.search}%`;
    queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  queryParams.push(options.limit, options.offset);
  
  const [rows] = await pool.query(query, queryParams);
  
  return rows;
};

/**
 * Get a staff member by ID
 * @param {string} id - Staff ID
 * @returns {Promise<Object|null>} - Staff member or null if not found
 */
const getStaffById = async (id, keepPassword = false) => {
  const [rows] = await pool.query(
    'SELECT * FROM staff WHERE staff_id = ?',
    [id]
  );
  
  if (rows.length === 0) {
    return null;
  }
  
  const staff = rows[0];
  
  // Decrypt sensitive fields
  sensitiveFields.forEach(field => {
    if (staff[field]) {
      staff[field] = decrypt(staff[field]);
    }
  });
  
  // Remove password
//   delete staff.password;
    if (!keepPassword) {
        delete staff.password;
    }
  
  return staff;
};

/**
 * Update a staff member
 * @param {string} id - Staff ID
 * @param {Object} staffData - Updated staff data
 * @returns {Promise<Object>} - Updated staff member
 */
const updateStaff = async (id, staffData) => {
    // Get the current staff data
    const [currentStaff] = await pool.query(
      'SELECT * FROM staff WHERE staff_id = ?',
      [id]
    );
    
    if (currentStaff.length === 0) {
      throw new Error('Staff member not found');
    }
    
    // Create updated staff object
    const updatedStaff = { ...currentStaff[0], ...staffData };
    
    // Encrypt sensitive fields if they were updated
    sensitiveFields.forEach(field => {
      if (staffData[field]) {
        updatedStaff[field] = encrypt(staffData[field]);
      }
    });
    
    // Format date of birth if it exists and was updated
    if (staffData.date_of_birth) {
      // Convert to YYYY-MM-DD format
      const date = new Date(staffData.date_of_birth);
      updatedStaff.date_of_birth = date.toISOString().split('T')[0];
    }
    
    // Hash password if it was updated
    if (staffData.password) {
      updatedStaff.password = await bcrypt.hash(staffData.password, 10);
      
      // Also update the user table password
      await pool.query(
        'UPDATE users SET password = ? WHERE id = ?',
        [updatedStaff.password, id]
      );
    }
    
    // Update the staff record
    await pool.query(
      `UPDATE staff SET 
        first_name = ?, last_name = ?, email = ?, mobile = ?, role = ?,
        specialization = ?, address = ?, city = ?, district = ?, gender = ?,
        date_of_birth = ?, nic = ?, profile_picture = ?, password = ?
      WHERE staff_id = ?`,
      [
        updatedStaff.first_name,
        updatedStaff.last_name,
        updatedStaff.email,
        updatedStaff.mobile,
        updatedStaff.role,
        updatedStaff.specialization,
        updatedStaff.address,
        updatedStaff.city,
        updatedStaff.district,
        updatedStaff.gender,
        updatedStaff.date_of_birth,
        updatedStaff.nic,
        updatedStaff.profile_picture,
        updatedStaff.password,
        id
      ]
    );
    
    // Update user email if it changed
    if (staffData.email && staffData.email !== currentStaff[0].email) {
      await pool.query(
        'UPDATE users SET email = ? WHERE id = ?',
        [staffData.email, id]
      );
    }
    
    // Get the updated staff
    return getStaffById(id);
};
  
  /**
   * Delete a staff member
   * @param {string} id - Staff ID
   * @returns {Promise<boolean>} - True if successfully deleted
   */
const deleteStaff = async (id) => {
    // Delete from users table first (foreign key constraint)
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    
    // Then delete from staff table
    const [result] = await pool.query(
      'DELETE FROM staff WHERE staff_id = ?',
      [id]
    );
    
    return result.affectedRows > 0;
};
  
  /**
   * Find staff by email
   * @param {string} email - Staff email
   * @returns {Promise<Object|null>} - Staff member or null if not found
   */
  const findStaffByEmail = async (email) => {
    const [rows] = await pool.query(
      'SELECT * FROM staff WHERE email = ?',
      [email]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    const staff = rows[0];
    
    // Decrypt sensitive fields
    sensitiveFields.forEach(field => {
      if (staff[field]) {
        staff[field] = decrypt(staff[field]);
      }
    });
    
    return staff;
  };

  
  
  module.exports = {
    createStaff,
    getAllStaff,
    getStaffById,
    updateStaff,
    deleteStaff,
    findStaffByEmail
  };