-- Add store column to expenses table
ALTER TABLE expenses ADD COLUMN store VARCHAR(255) NULL;

-- Add store column to income_sources table  
ALTER TABLE income_sources ADD COLUMN store VARCHAR(255) NULL;
