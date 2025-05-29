const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration - same as in your app
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'trustmed'
};

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');
    
    // Create connection
    const connection = await mysql.createConnection(dbConfig);
    
    // Password hashing
    const hashPassword = (password) => bcrypt.hashSync(password, 8);
    
    // Create admin user
    await connection.execute(
      `INSERT INTO admins (admin_id, username, email, password, full_name, mobile) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['AD001', 'admin', 'admin@trustmed.com', hashPassword('admin1234'), 'TrustMed Admin', '0771234567']
    );
    console.log('Admin user created');
    
    // Create doctor
    await connection.execute(
      `INSERT INTO staff (staff_id, first_name, last_name, email, mobile, role, specialization, 
       address, city, district, gender, nic, password) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['ST001', 'John', 'Doe', 'john.doe@trustmed.com', '0712345678', 'doctor', 'General Medicine',
       '123 Medical Center', 'Colombo', 'Western', 'Male', '901234567V', hashPassword('password123')]
    );
    console.log('Doctor user created');
    
    // Create insurance company
    await connection.execute(
      `INSERT INTO insurance (company_id, company_name, company_type, website, hotline, email, address, 
       city, district, postal_code, description, password) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['IN001', 'MediShield Insurance', 'Health Insurance', 'https://medishield.com', '0112345678', 
       'info@medishield.com', '456 Insurance Avenue', 'Colombo', 'Western', '00100', 
       'Leading health insurance provider', hashPassword('insurance123')]
    );
    console.log('Insurance company created');
    
    // Create some sample patients
    const patients = [
      ['PT001', 'Sarah Johnson', 'S.J.', '845678123V', '1984-05-15', 'Female', 'O+', 
       'Penicillin', '123 Main St', 'Colombo', 'Western', '00100', '0771234567', '0112345678', 
       'sarah.j@example.com'],
      ['PT002', 'Michael Brown', 'M.B.', '906789234V', '1990-08-22', 'Male', 'A-', 
       'None', '456 Park Ave', 'Kandy', 'Central', '20000', '0772345678', '0812345678', 
       'michael.b@example.com'],
      ['PT003', 'Emily Davis', 'E.D.', '887890345V', '1988-11-10', 'Female', 'B+', 
       'Sulfa drugs', '789 Hospital Rd', 'Galle', 'Southern', '80000', '0773456789', '0912345678', 
       'emily.d@example.com']
    ];
    
    for (const patient of patients) {
      // For simplicity in this example we're storing the encrypted fields as regular text
      // In your actual application, these would be encrypted using your encryption.service.js
      await connection.execute(
        `INSERT INTO patients (patient_id, name, name_initials, nic, date_of_birth, gender, blood_type, 
         allergies, address, city, district, postal_code, mobile, telephone, email) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        patient
      );
    }
    console.log('Sample patients created');
    
    // Close connection
    await connection.end();
    
    console.log('Database seeding completed successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seeder
seedDatabase();