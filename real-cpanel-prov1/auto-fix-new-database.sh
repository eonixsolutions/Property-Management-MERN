#!/bin/bash
# Auto-fix script to run whenever a new database is added
# This ensures new databases are automatically accessible

ROOT_PASS="Tz@669933"
DB_USER="sidhyk"

# Grant access to all databases (including newly created ones)
mysql -u root -p"$ROOT_PASS" << EOF 2>/dev/null
-- Grant all privileges on all databases
GRANT ALL PRIVILEGES ON *.* TO '$DB_USER'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;
EOF

echo "✓ Database access updated for all databases"

