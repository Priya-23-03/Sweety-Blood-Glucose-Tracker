// Runs before every test file: point the app at the TEST database.
require('dotenv').config();
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://sweety:sweety@localhost:5432/sweety_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
