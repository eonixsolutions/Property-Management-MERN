/**
 * MongoDB initialization script — runs once when the container is first created.
 * Creates the application database user with read/write permissions on property_db.
 *
 * The root credentials used here come from MONGO_INITDB_ROOT_* env vars.
 */
db = db.getSiblingDB('property_db');

db.createUser({
  user: 'property_user',
  pwd: 'property_pass_change_in_prod',
  roles: [{ role: 'readWrite', db: 'property_db' }],
});

// Seed a placeholder document so the database is visible in mongo-express
db.createCollection('_init');
db._init.insertOne({ initialized: true, at: new Date() });

print('✅ property_db initialized');
