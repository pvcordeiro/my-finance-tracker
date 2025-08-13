-- Create demo user with proper password hash
INSERT OR IGNORE INTO users (id, username, password_hash) 
VALUES (1, 'demo', '$2b$10$rQZ9vKzf8xGxJ8yJ8yOzJ8yJ8yJ8yJ8yJ8yJ8yJ8yJ8yJ8yJ8yJ8y');

-- Insert sample bank amount for demo user
INSERT OR IGNORE INTO bank_amounts (user_id, amount) VALUES (1, 5000.00);

-- Insert sample income entries for demo user
INSERT OR IGNORE INTO entries (user_id, name, type, amounts) VALUES 
(1, 'Salary', 'income', '[3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000]'),
(1, 'Freelance', 'income', '[500, 800, 600, 700, 900, 500, 600, 800, 700, 600, 800, 900]');

-- Insert sample expense entries for demo user
INSERT OR IGNORE INTO entries (user_id, name, type, amounts) VALUES 
(1, 'Rent', 'expense', '[1200, 1200, 1200, 1200, 1200, 1200, 1200, 1200, 1200, 1200, 1200, 1200]'),
(1, 'Groceries', 'expense', '[400, 450, 380, 420, 460, 400, 430, 450, 410, 440, 420, 480]'),
(1, 'Utilities', 'expense', '[150, 180, 140, 160, 170, 150, 160, 180, 150, 170, 160, 190]');
