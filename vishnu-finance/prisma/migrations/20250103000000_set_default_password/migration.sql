-- Set default password for all users
-- Default password: password123 (hashed with bcrypt)
-- This migration updates all existing users to have the default password

UPDATE `users` 
SET `password` = '$2b$10$fguj92SZXkXT4KNZcRHcP.BpCzX/eHxzu6GxUTWxTKtP/IpVttQP6',
    `updatedAt` = CURRENT_TIMESTAMP(3)
WHERE `password` != '$2b$10$fguj92SZXkXT4KNZcRHcP.BpCzX/eHxzu6GxUTWxTKtP/IpVttQP6' OR `password` NOT LIKE '$2b$%';

