const { pool } = require('../config/database');

/**
 * Log an audit event
 * @param {string} userId - ID of user performing the action
 * @param {string} action - Type of action (e.g., 'create', 'update', 'delete', 'view')
 * @param {string} resourceType - Type of resource affected (e.g., 'patient', 'record')
 * @param {string} resourceId - ID of the affected resource
 * @param {Object} details - Additional details about the action
 * @returns {Promise} - Resolves with the inserted audit log ID
 */
const logAudit = async (userId, action, resourceType, resourceId, details = {}) => {
  try {
    const [result] = await pool.query(
      `INSERT INTO audit_logs 
       (user_id, action, resource_type, resource_id, details, created_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [userId, action, resourceType, resourceId, JSON.stringify(details)]
    );
    
    return result.insertId;
  } catch (error) {
    console.error('Audit logging error:', error);
    return null;
  }
};

/**
 * Get audit logs for a specific resource
 * @param {string} resourceType - Type of resource
 * @param {string} resourceId - ID of the resource
 * @param {Object} options - Query options (limit, offset)
 * @returns {Promise<Array>} - Resolves with array of audit logs
 */
const getAuditLogs = async (resourceType, resourceId, options = { limit: 100, offset: 0 }) => {
  try {
    const [rows] = await pool.query(
      `SELECT al.*, 
        CASE 
          WHEN u.role IN ('admin', 'doctor') THEN CONCAT(s.first_name, ' ', s.last_name)
          WHEN u.role = 'insurance' THEN ic.company_name
          ELSE 'Unknown'
        END AS user_name,
        u.role AS user_role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN staff s ON u.id = s.staff_id AND u.role IN ('admin', 'doctor')
      LEFT JOIN insurance_companies ic ON u.id = ic.company_id AND u.role = 'insurance'
      WHERE al.resource_type = ? AND al.resource_id = ?
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?`,
      [resourceType, resourceId, options.limit, options.offset]
    );
    
    return rows.map(row => ({
      ...row,
      details: JSON.parse(row.details || '{}')
    }));
  } catch (error) {
    console.error('Error retrieving audit logs:', error);
    throw error;
  }
};

module.exports = {
  logAudit,
  getAuditLogs
};