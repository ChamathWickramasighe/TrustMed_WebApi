-- Users table for authentication (base table)
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'doctor', 'insurance') NOT NULL,
    first_login BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
);

-- Staff table (admin, doctors)
CREATE TABLE staff (
    staff_id VARCHAR(36) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    mobile VARCHAR(20) NOT NULL,
    role ENUM('admin', 'doctor') NOT NULL,
    specialization VARCHAR(100),
    address TEXT,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    gender ENUM('Male', 'Female', 'Other'),
    date_of_birth DATE,
    nic VARCHAR(20) UNIQUE,
    profile_picture VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Patients table
CREATE TABLE patients (
    patient_id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_initials VARCHAR(50) NOT NULL,
    nic VARCHAR(20) UNIQUE,
    date_of_birth DATE NOT NULL,
    gender ENUM('Male', 'Female', 'Other') NOT NULL,
    blood_type VARCHAR(10) NOT NULL,
    allergies TEXT,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    telephone VARCHAR(20),
    email VARCHAR(255) NOT NULL,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
);

-- Insurance Companies table
CREATE TABLE insurance_companies (
    company_id VARCHAR(36) PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    company_type VARCHAR(100),
    registration_number VARCHAR(100) UNIQUE,
    website VARCHAR(255),
    hotline VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Lab Tests table
CREATE TABLE lab_tests (
    test_id VARCHAR(36) PRIMARY KEY,
    test_name VARCHAR(255) NOT NULL,
    description TEXT,
    test_type VARCHAR(100) NOT NULL,
    normal_range VARCHAR(255),
    unit VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Medicines table
CREATE TABLE medicines (
    med_id VARCHAR(36) PRIMARY KEY,
    med_name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    manufacturer VARCHAR(255),
    available_dosages JSON,
    side_effects TEXT,
    contraindications TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prescriptions table
CREATE TABLE prescriptions (
    prescription_id VARCHAR(36) PRIMARY KEY,
    med_id VARCHAR(36) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    duration VARCHAR(100) NOT NULL,
    instructions TEXT,
    after_meal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (med_id) REFERENCES medicines(med_id) ON DELETE RESTRICT
);

-- Medical Records table 
CREATE TABLE records (
    record_id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL,
    doc_id VARCHAR(36) NOT NULL,
    record_type ENUM('consultation', 'prescription', 'lab_test', 'diagnosis', 'treatment') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    diagnosis TEXT,
    symptoms TEXT,
    vital_signs JSON,
    prescription_id VARCHAR(36),
    test_id VARCHAR(36),
    test_results JSON,
    attachments JSON,
    confidentiality_level ENUM('normal', 'sensitive', 'restricted') DEFAULT 'normal',
    visit_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE RESTRICT,
    FOREIGN KEY (doc_id) REFERENCES staff(staff_id) ON DELETE RESTRICT,
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(prescription_id) ON DELETE SET NULL,
    FOREIGN KEY (test_id) REFERENCES lab_tests(test_id) ON DELETE SET NULL
);

-- Insurance Allocations table 
CREATE TABLE insurance_allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL,
    patient_id VARCHAR(36) NOT NULL,
    policy_number VARCHAR(100),
    coverage_type VARCHAR(100),
    coverage_start_date DATE,
    coverage_end_date DATE,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES insurance_companies(company_id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    UNIQUE KEY unique_allocation (company_id, patient_id, policy_number)
);

-- Data Requests table 
CREATE TABLE data_requests (
    request_id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL,
    patient_id VARCHAR(36) NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    request_details JSON,
    requested_record_types JSON,
    date_range_start DATE,
    date_range_end DATE,
    urgency_level ENUM('low', 'medium', 'high') DEFAULT 'medium',
    status ENUM('pending', 'approved', 'rejected', 'fulfilled') DEFAULT 'pending',
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_date TIMESTAMP NULL,
    reviewed_by VARCHAR(36),
    response_notes TEXT,
    expiry_date TIMESTAMP,
    created_by VARCHAR(36) NOT NULL,
    FOREIGN KEY (company_id) REFERENCES insurance_companies(company_id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES staff(staff_id) ON DELETE SET NULL,
    INDEX idx_status_date (status, request_date),
    INDEX idx_patient_company (patient_id, company_id)
);

-- Approved Records table 
CREATE TABLE approved_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(36) NOT NULL,
    record_id VARCHAR(36) NOT NULL,
    approved_by VARCHAR(36) NOT NULL,
    access_granted_until TIMESTAMP,
    access_count INT DEFAULT 0,
    max_access_count INT DEFAULT 1,
    encryption_key_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES data_requests(request_id) ON DELETE CASCADE,
    FOREIGN KEY (record_id) REFERENCES records(record_id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES staff(staff_id) ON DELETE RESTRICT,
    UNIQUE KEY unique_approval (request_id, record_id)
);

-- Claims table (insurance claims)
CREATE TABLE claims (
    claim_id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL,
    patient_id VARCHAR(36) NOT NULL,
    policy_number VARCHAR(100),
    claim_amount DECIMAL(10,2),
    claim_type VARCHAR(100),
    claim_details TEXT NOT NULL,
    supporting_documents JSON,
    status ENUM('pending', 'under_review', 'approved', 'rejected', 'paid') DEFAULT 'pending',
    claim_date DATE NOT NULL,
    review_notes TEXT,
    settlement_amount DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES insurance_companies(company_id) ON DELETE RESTRICT,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE RESTRICT
);

-- Audit Logs 
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(36),
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(255),
    details TEXT,
    severity ENUM('info', 'warning', 'error', 'critical') DEFAULT 'info',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_action (user_id, action),
    INDEX idx_resource (resource_type, resource_id),
    INDEX idx_timestamp (created_at)
);

-- Notification table 
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipient_id VARCHAR(36) NOT NULL,
    recipient_type ENUM('staff', 'insurance') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'warning', 'success', 'error') DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    related_resource_type VARCHAR(50),
    related_resource_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    INDEX idx_recipient (recipient_id, is_read),
    INDEX idx_created (created_at)
);

-- Create indexes for better performance
CREATE INDEX idx_records_patient_date ON records(patient_id, visit_date DESC);
CREATE INDEX idx_records_doctor_date ON records(doc_id, created_at DESC);
CREATE INDEX idx_data_requests_company ON data_requests(company_id, status);
CREATE INDEX idx_audit_logs_user_time ON audit_logs(user_id, created_at DESC);

