const { pool } = require('../config/database');
const { encrypt, decrypt } = require('../services/encryption.service');
const auditService = require('../services/audit.service');
const { generatePatientId } = require('../utils/idGenerator');

// Get all patients
exports.getAllPatients = async (req, res) => {
  try {
    // Check permissions based on role
    if (req.userType !== 'admin' && req.userType !== 'doctor') {
      return res.status(403).send({
        status: 'error',
        message: 'Unauthorized to access patient data'
      });
    }
    
    const [rows] = await pool.execute('SELECT * FROM patients');
    
    // Decrypt sensitive data
    const patients = rows.map(patient => {
      return {
        ...patient,
        allergies: decrypt(patient.allergies),
        address: decrypt(patient.address)
      };
    });
    
    await auditService.logAction(
      req.userId,
      req.userRole,
      'Get All Patients',
      null,
      req.ip
    );
    
    return res.status(200).send({
      status: 'success',
      message: 'Patients retrieved successfully',
      data: patients
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: 'error',
      message: 'Server error while retrieving patients'
    });
  }
};

// Get patient by ID
exports.getPatientById = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // Check permissions based on role
    if (req.userRole !== 'admin' && req.userRole !== 'doctor') {
      // For insurance, check if they have allocation for this patient
      if (req.userRole === 'insurance') {
        const [allocations] = await pool.execute(
          'SELECT * FROM insurance_allocation WHERE company_id = ? AND patient_id = ? AND status = "approved"',
          [req.userId, patientId]
        );
        
        if (allocations.length === 0) {
          return res.status(403).send({
            status: 'error',
            message: 'Not authorized to access this patient data'
          });
        }
      } else {
        return res.status(403).send({
          status: 'error',
          message: 'Unauthorized to access patient data'
        });
      }
    }
    
    const [rows] = await pool.execute('SELECT * FROM patients WHERE patient_id = ?', [patientId]);
    
    if (rows.length === 0) {
      return res.status(404).send({
        status: 'error',
        message: 'Patient not found'
      });
    }
    
    // Decrypt sensitive data
    const patient = {
      ...rows[0],
      allergies: decrypt(rows[0].allergies),
      address: decrypt(rows[0].address)
    };
    
    await auditService.logAction(
      req.userId,
      req.userRole,
      'Get Patient Details',
      { patientId },
      req.ip
    );
    
    return res.status(200).send({
      status: 'success',
      message: 'Patient retrieved successfully',
      data: patient
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: 'error',
      message: 'Server error while retrieving patient'
    });
  }
};

// Create new patient
exports.createPatient = async (req, res) => {
  try {
    // Only admins and doctors can create patients
    if (req.userRole !== 'admin' && req.userRole !== 'doctor') {
      return res.status(403).send({
        status: 'error',
        message: 'Unauthorized to create patients'
      });
    }
    
    const { 
      name, name_initials, nic, date_of_birth, gender, blood_type, 
      allergies, address, city, district, postal_code, mobile, telephone, email 
    } = req.body;
    
    // Generate patient ID
    const patientId = await generatePatientId();
    
    // Encrypt sensitive data
    const encryptedAllergies = encrypt(allergies);
    const encryptedAddress = encrypt(address);
    
    // Insert patient
    const query = `
      INSERT INTO patients (
        patient_id, name, name_initials, nic, date_of_birth, gender, 
        blood_type, allergies, address, city, district, postal_code, 
        mobile, telephone, email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await pool.execute(query, [
      patientId, name, name_initials, nic, date_of_birth, gender, 
      blood_type, encryptedAllergies, encryptedAddress, city, district, 
      postal_code, mobile, telephone, email
    ]);
    
    await auditService.logAction(
      req.userId,
      req.userRole,
      'Create Patient',
      { patientId, name },
      req.ip
    );
    
    return res.status(201).send({
      status: 'success',
      message: 'Patient created successfully',
      data: { patientId }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: 'error',
      message: 'Server error while creating patient'
    });
  }
};

// Update patient
exports.updatePatient = async (req, res) => {
  try {
    // Only admins and doctors can update patients
    if (req.userRole !== 'admin' && req.userRole !== 'doctor') {
      return res.status(403).send({
        status: 'error',
        message: 'Unauthorized to update patients'
      });
    }
    
    const { patientId } = req.params;
    const { 
      name, name_initials, nic, date_of_birth, gender, blood_type, 
      allergies, address, city, district, postal_code, mobile, telephone, email 
    } = req.body;
    
    // Check if patient exists
    const [rows] = await pool.execute('SELECT * FROM patients WHERE patient_id = ?', [patientId]);
    
    if (rows.length === 0) {
      return res.status(404).send({
        status: 'error',
        message: 'Patient not found'
      });
    }
    
    // Encrypt sensitive data
    const encryptedAllergies = allergies ? encrypt(allergies) : rows[0].allergies;
    const encryptedAddress = address ? encrypt(address) : rows[0].address;
    
    // Update patient
    const query = `
      UPDATE patients SET
        name = COALESCE(?, name),
        name_initials = COALESCE(?, name_initials),
        nic = COALESCE(?, nic),
        date_of_birth = COALESCE(?, date_of_birth),
        gender = COALESCE(?, gender),
        blood_type = COALESCE(?, blood_type),
        allergies = COALESCE(?, allergies),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        district = COALESCE(?, district),
        postal_code = COALESCE(?, postal_code),
        mobile = COALESCE(?, mobile),
        telephone = COALESCE(?, telephone),
        email = COALESCE(?, email)
      WHERE patient_id = ?
    `;
    
    await pool.execute(query, [
      name, name_initials, nic, date_of_birth, gender, blood_type, 
      encryptedAllergies, encryptedAddress, city, district, postal_code, 
      mobile, telephone, email, patientId
    ]);
    
    await auditService.logAction(
      req.userId,
      req.userRole,
      'Update Patient',
      { patientId },
      req.ip
    );
    
    return res.status(200).send({
      status: 'success',
      message: 'Patient updated successfully'
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: 'error',
      message: 'Server error while updating patient'
    });
  }
};

// Delete patient
exports.deletePatient = async (req, res) => {
  try {
    // Only admins and doctors can delete patients
    if (req.userType !== 'admin' && req.userType !== 'doctor') {
      return res.status(403).send({
        status: 'error',
        message: 'Unauthorized to delete patients'
      });
    }
    
    const { patientId } = req.params;
    
    // Check if patient exists
    const [patientRows] = await pool.execute('SELECT * FROM patients WHERE patient_id = ?', [patientId]);
    
    if (patientRows.length === 0) {
      return res.status(404).send({
        status: 'error',
        message: 'Patient not found'
      });
    }
    
    // Start a transaction to ensure all related data is deleted properly
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Get all records for this patient
      const [recordRows] = await connection.execute(
        'SELECT record_id FROM records WHERE patient_id = ?', 
        [patientId]
      );
      
      // Delete prescription entries for this patient's records
      for (const record of recordRows) {
        await connection.execute(
          'DELETE FROM prescription WHERE prescription_id IN (SELECT prescription_id FROM records WHERE record_id = ?)',
          [record.record_id]
        );
      }
      
      // Delete all insurance_claims related to the patient's records
      await connection.execute(
        'DELETE FROM insurance_claims WHERE record_id IN (SELECT record_id FROM records WHERE patient_id = ?)',
        [patientId]
      );
      
      // Delete all records
      await connection.execute('DELETE FROM records WHERE patient_id = ?', [patientId]);
      
      // Delete insurance allocations
      await connection.execute('DELETE FROM insurance_allocation WHERE patient_id = ?', [patientId]);
      
      // Delete data requests
      await connection.execute('DELETE FROM data_requests WHERE patient_id = ?', [patientId]);
      
      // Finally, delete the patient
      await connection.execute('DELETE FROM patients WHERE patient_id = ?', [patientId]);
      
      // Commit the transaction
      await connection.commit();
      
      await auditService.logAction(
        req.userId,
        req.userType,
        'Delete Patient',
        { patientId },
        req.ip
      );
      
      return res.status(200).send({
        status: 'success',
        message: 'Patient and all associated data deleted successfully'
      });
    } catch (error) {
      // If there's an error, rollback the transaction
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: 'error',
      message: 'Server error while deleting patient'
    });
  }
};