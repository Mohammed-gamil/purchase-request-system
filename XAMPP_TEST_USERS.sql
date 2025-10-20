-- =====================================================
-- Create Test Users - XAMPP/phpMyAdmin
-- Database: finaldb
-- =====================================================
-- Password for all users: "password"
-- =====================================================

-- Step 1: Check table structure first
DESCRIBE users;

-- =====================================================
-- Step 2: Insert Users (Basic columns only)
-- =====================================================

-- 1. Sales Representative
INSERT INTO users (name, email, password, created_at, updated_at) 
VALUES (
    'Ahmed Sales Rep', 
    'sales@test.com', 
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    NOW(),
    NOW()
);

-- 2. Admin User
INSERT INTO users (name, email, password, created_at, updated_at) 
VALUES (
    'Admin User', 
    'admin@test.com', 
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    NOW(),
    NOW()
);

-- 3. Additional Sales Rep
INSERT INTO users (name, email, password, created_at, updated_at) 
VALUES (
    'Mohamed Sales Rep', 
    'sales2@test.com', 
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    NOW(),
    NOW()
);

-- =====================================================
-- Step 3: Update roles if column exists
-- =====================================================
-- Run DESCRIBE users; first to check if 'role' column exists
-- If it exists, run these updates:

UPDATE users SET role = 'SALES_REP' WHERE email = 'sales@test.com';
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@test.com';
UPDATE users SET role = 'SALES_REP' WHERE email = 'sales2@test.com';

-- If 'is_active' column exists:
UPDATE users SET is_active = 1 WHERE email LIKE '%@test.com';

-- =====================================================
-- Step 4: Verify
-- =====================================================
SELECT * FROM users WHERE email LIKE '%@test.com';

-- =====================================================
-- Login Credentials:
-- =====================================================
-- Sales Rep 1: sales@test.com / password
-- Admin: admin@test.com / password
-- Sales Rep 2: sales2@test.com / password
-- =====================================================

-- =====================================================
-- Troubleshooting:
-- =====================================================
-- If you get "column not found" error, check columns:
-- SHOW COLUMNS FROM users;
-- 
-- Then modify INSERT to match your columns
-- =====================================================
