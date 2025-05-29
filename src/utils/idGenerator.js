const { pool } = require('../config/database');

// Generate unique ID with prefix and padded number
const generateId = async (prefix, table, column) => {
  try {
    // Get the last ID from the table
    const query = `
      SELECT ${column} FROM ${table}
      WHERE ${column} LIKE '${prefix}%'
      ORDER BY CAST(SUBSTRING(${column}, ${prefix.length + 1}) AS UNSIGNED) DESC
      LIMIT 1
    `;
    
    const [rows] = await pool.execute(query);
    
    let lastId = 0;
    
    if (rows.length > 0) {
      // Extract the number part of the ID
      const lastIdString = rows[0][column];
      // Use regex to extract only digits from the ID
      const matches = lastIdString.match(new RegExp(`${prefix}(\\d+)`));
      if (matches && matches[1]) {
        lastId = parseInt(matches[1], 10);
      }
    }
    
    // Increment and pad with leading zeros (use 3 digits for standard format)
    const nextId = lastId + 1;
    const paddedId = nextId.toString().padStart(3, '0');
    
    console.log(`Generated ID: ${prefix}${paddedId} for ${table}.${column}`);
    return `${prefix}${paddedId}`;
  } catch (error) {
    console.error('Error generating ID:', error, 'for', prefix, table, column);
    // Log the error but still provide a sequential fallback - don't use timestamps
    const fallbackId = `${prefix}001`;
    console.log(`Fallback to: ${fallbackId}`);
    return fallbackId;
  }
};

// Specific ID generators with corrected table and column names
exports.generatePatientId = async () => generateId('PT', 'patients', 'patient_id');
exports.generateStaffId = async () => generateId('ST', 'staff', 'staff_id');
exports.generateAdminId = async () => generateId('AD', 'users', 'id');
exports.generateInsuranceId = async () => generateId('IN', 'insurance_companies', 'company_id');
exports.generateRecordId = async () => generateId('REC', 'records', 'record_id');
exports.generatePrescriptionId = async () => generateId('PRE', 'prescriptions', 'prescription_id');
exports.generateTestId = async () => generateId('TEST', 'lab_tests', 'test_id');
exports.generateMedicineId = async () => generateId('MED', 'medicines', 'med_id');
exports.generateAllocationId = async () => generateId('AL', 'insurance_allocations', 'allocation_id');
exports.generateClaimId = async () => generateId('CL', 'insurance_claims', 'claim_id');
exports.generateRequestId = async () => generateId('REQ', 'data_requests', 'request_id');