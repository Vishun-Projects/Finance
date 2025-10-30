-- Performance optimization indexes for ultra-fast queries
-- This migration adds comprehensive indexing for millisecond response times

-- User table indexes
CREATE INDEX idx_users_email_active ON users(email, isActive);
CREATE INDEX idx_users_last_login ON users(lastLogin);
CREATE INDEX idx_users_created_at ON users(createdAt);

-- Income sources indexes
CREATE INDEX idx_income_sources_user_id_active ON income_sources(userId, isActive);
CREATE INDEX idx_income_sources_user_id_date ON income_sources(userId, startDate);
CREATE INDEX idx_income_sources_user_id_amount ON income_sources(userId, amount);
CREATE INDEX idx_income_sources_category_id ON income_sources(categoryId);
CREATE INDEX idx_income_sources_frequency ON income_sources(frequency);

-- Expenses indexes
CREATE INDEX idx_expenses_user_id_date ON expenses(userId, date);
CREATE INDEX idx_expenses_user_id_amount ON expenses(userId, amount);
CREATE INDEX idx_expenses_user_id_category ON expenses(userId, categoryId);
CREATE INDEX idx_expenses_date_amount ON expenses(date, amount);
CREATE INDEX idx_expenses_recurring ON expenses(isRecurring);
CREATE INDEX idx_expenses_frequency ON expenses(frequency);

-- Goals indexes
CREATE INDEX idx_goals_user_id_active ON goals(userId, isActive);
CREATE INDEX idx_goals_user_id_priority ON goals(userId, priority);
CREATE INDEX idx_goals_user_id_target_date ON goals(userId, targetDate);
CREATE INDEX idx_goals_target_amount ON goals(targetAmount);
CREATE INDEX idx_goals_current_amount ON goals(currentAmount);

-- Deadlines indexes
CREATE INDEX idx_deadlines_user_id_status ON deadlines(userId, status);
CREATE INDEX idx_deadlines_user_id_due_date ON deadlines(userId, dueDate);
CREATE INDEX idx_deadlines_user_id_completed ON deadlines(userId, isCompleted);
CREATE INDEX idx_deadlines_due_date_status ON deadlines(dueDate, status);
CREATE INDEX idx_deadlines_recurring ON deadlines(isRecurring);

-- Wishlist indexes
CREATE INDEX idx_wishlist_user_id_priority ON wishlist_items(userId, priority);
CREATE INDEX idx_wishlist_user_id_completed ON wishlist_items(userId, isCompleted);
CREATE INDEX idx_wishlist_user_id_target_date ON wishlist_items(userId, targetDate);
CREATE INDEX idx_wishlist_estimated_cost ON wishlist_items(estimatedCost);

-- Salary structure indexes
CREATE INDEX idx_salary_structure_user_id_active ON salary_structures(userId, isActive);
CREATE INDEX idx_salary_structure_user_id_effective_date ON salary_structures(userId, effectiveDate);
CREATE INDEX idx_salary_structure_base_salary ON salary_structures(baseSalary);

-- Salary history indexes
CREATE INDEX idx_salary_history_user_id ON salary_history(userId);
CREATE INDEX idx_salary_history_salary_structure_id ON salary_history(salaryStructureId);
CREATE INDEX idx_salary_history_effective_date ON salary_history(effectiveDate);
CREATE INDEX idx_salary_history_change_type ON salary_history(changeType);

-- Categories indexes
CREATE INDEX idx_categories_user_id_type ON categories(userId, type);
CREATE INDEX idx_categories_type_default ON categories(type, isDefault);
CREATE INDEX idx_categories_name ON categories(name);

-- Recurring items indexes
CREATE INDEX idx_recurring_items_user_id_active ON recurring_items(userId, isActive);
CREATE INDEX idx_recurring_items_user_id_type ON recurring_items(userId, type);
CREATE INDEX idx_recurring_items_next_due_date ON recurring_items(nextDueDate);
CREATE INDEX idx_recurring_items_frequency ON recurring_items(frequency);

-- Refresh tokens indexes
CREATE INDEX idx_refresh_tokens_user_id_active ON refresh_tokens(userId, isActive);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expiresAt);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- User preferences indexes
CREATE INDEX idx_user_preferences_user_id ON user_preferences(userId);
CREATE INDEX idx_user_preferences_currency ON user_preferences(currency);
CREATE INDEX idx_user_preferences_theme ON user_preferences(theme);

-- News preferences indexes
CREATE INDEX idx_news_preferences_user_id ON news_preferences(userId);
CREATE INDEX idx_news_preferences_frequency ON news_preferences(frequency);

-- Financial reports indexes
CREATE INDEX idx_financial_reports_user_id ON financial_reports(userId);
CREATE INDEX idx_financial_reports_user_id_type ON financial_reports(userId, type);
CREATE INDEX idx_financial_reports_user_id_period ON financial_reports(userId, period);
CREATE INDEX idx_financial_reports_created_at ON financial_reports(createdAt);

-- News cache indexes
CREATE INDEX idx_news_cache_published_at ON news_cache(publishedAt);
CREATE INDEX idx_news_cache_relevance ON news_cache(relevance);
CREATE INDEX idx_news_cache_created_at ON news_cache(createdAt);

-- Composite indexes for complex queries
CREATE INDEX idx_expenses_user_date_category ON expenses(userId, date, categoryId);
CREATE INDEX idx_income_user_date_category ON income_sources(userId, startDate, categoryId);
CREATE INDEX idx_goals_user_priority_active ON goals(userId, priority, isActive);
CREATE INDEX idx_deadlines_user_due_status ON deadlines(userId, dueDate, status);

-- Full-text search indexes for better search performance
CREATE FULLTEXT INDEX idx_expenses_description ON expenses(description);
CREATE FULLTEXT INDEX idx_goals_title_description ON goals(title, description);
CREATE FULLTEXT INDEX idx_deadlines_title_description ON deadlines(title, description);
CREATE FULLTEXT INDEX idx_wishlist_title_description ON wishlist_items(title, description);

-- Performance monitoring indexes
CREATE INDEX idx_performance_queries ON performance_queries(query_hash, execution_time);
CREATE INDEX idx_performance_queries_timestamp ON performance_queries(timestamp);
