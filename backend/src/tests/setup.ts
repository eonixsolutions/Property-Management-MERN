/**
 * Global Vitest setup — runs before every test file.
 *
 * Sets required environment variables so env.ts validation passes
 * without a real .env file present in CI / test environments.
 */
process.env['NODE_ENV'] = 'test';
process.env['PORT'] = '3001';
process.env['MONGODB_URI'] = 'mongodb://127.0.0.1:27017/property_db_test';
process.env['JWT_ACCESS_SECRET'] = 'test_access_secret_must_be_at_least_32_chars_long_here';
process.env['JWT_REFRESH_SECRET'] = 'test_refresh_secret_must_be_at_least_32_chars_long_here';
process.env['COOKIE_SECRET'] = 'test_cookie_secret_must_be_at_least_32_chars_long_here';
process.env['CORS_ORIGINS'] = 'http://localhost:5173';
process.env['LOG_LEVEL'] = 'silent';
