const { pool } = require('../config/database');

/**
 * Create a new medicine
 * @param {Object} medicineData - Medicine data
 * @returns {Promise<Object>} - The created medicine
 */
const createMedicine = async (medicineData) => {
  // Generate medicine ID
  const medId = `MED${Date.now().toString().slice(-6)}`;
  
  const [result] = await pool.query(
    `INSERT INTO medicines (
      med_id, med_name, dosages, created_at
    ) VALUES (?, ?, ?, NOW())`,
    [
      medId,
      medicineData.med_name,
      medicineData.dosages,
    ]
  );
  
  // Return created medicine
  return getMedicineById(medId);
};

/**
 * Get all medicines
 * @param {Object} options - Query options (search, limit, offset)
 * @returns {Promise<Array>} - Array of medicines
 */
const getAllMedicines = async (options = { search: '', limit: 100, offset: 0 }) => {
  let query = `
    SELECT med_id, med_name, dosages, created_at
    FROM medicines
  `;
  
  const queryParams = [];
  
  if (options.search) {
    query += `
      WHERE med_name LIKE ? OR dosages LIKE ?
    `;
    const searchTerm = `%${options.search}%`;
    queryParams.push(searchTerm, searchTerm);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  queryParams.push(options.limit, options.offset);
  
  const [rows] = await pool.query(query, queryParams);
  
  return rows;
};

/**
 * Get a medicine by ID
 * @param {string} id - Medicine ID
 * @returns {Promise<Object|null>} - Medicine or null if not found
 */
const getMedicineById = async (id) => {
  const [rows] = await pool.query(
    'SELECT * FROM medicines WHERE med_id = ?',
    [id]
  );
  
  if (rows.length === 0) {
    return null;
  }
  
  return rows[0];
};

/**
 * Update a medicine
 * @param {string} id - Medicine ID
 * @param {Object} medicineData - Updated medicine data
 * @returns {Promise<Object>} - Updated medicine
 */
const updateMedicine = async (id, medicineData) => {
  // Update the medicine record
  await pool.query(
    `UPDATE medicines SET 
      med_name = ?, dosages = ?
    WHERE med_id = ?`,
    [
      medicineData.med_name,
      medicineData.dosages,
      id
    ]
  );
  
  // Get the updated medicine
  return getMedicineById(id);
};

/**
 * Delete a medicine
 * @param {string} id - Medicine ID
 * @returns {Promise<boolean>} - True if successfully deleted
 */
const deleteMedicine = async (id) => {
  const [result] = await pool.query(
    'DELETE FROM medicines WHERE med_id = ?',
    [id]
  );
  
  return result.affectedRows > 0;
};

module.exports = {
  createMedicine,
  getAllMedicines,
  getMedicineById,
  updateMedicine,
  deleteMedicine
};