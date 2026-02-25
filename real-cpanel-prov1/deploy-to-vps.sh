#!/bin/bash

# VPS Deployment Script for Real Estate Management System
# Run this script on the VPS server after transferring files

set -e  # Exit on error

echo "========================================="
echo "Real Estate Management System - VPS Deployment"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/html/realestate"
DB_NAME="realv1"
DB_USER="realv1_user"
DB_PASS="Tz@669933"
BASE_URL="https://realestate.fmcqatar.com"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root${NC}"
    exit 1
fi

echo -e "${GREEN}Step 1: Checking project directory...${NC}"
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}Error: Project directory not found at $PROJECT_DIR${NC}"
    echo "Please transfer files first using SCP or SFTP"
    exit 1
fi
echo -e "${GREEN}✓ Project directory found${NC}"

echo ""
echo -e "${GREEN}Step 2: Setting file permissions...${NC}"
cd "$PROJECT_DIR"
chown -R www-data:www-data "$PROJECT_DIR"
chmod -R 755 "$PROJECT_DIR"
chmod -R 775 uploads/ 2>/dev/null || mkdir -p uploads && chmod -R 775 uploads/
echo -e "${GREEN}✓ Permissions set${NC}"

echo ""
echo -e "${GREEN}Step 3: Creating uploads directory structure...${NC}"
mkdir -p uploads/properties
chmod -R 775 uploads/
chown -R www-data:www-data uploads/
echo -e "${GREEN}✓ Uploads directory created${NC}"

echo ""
echo -e "${GREEN}Step 4: Database setup...${NC}"
echo "Checking if database exists..."

# Check if database exists
DB_EXISTS=$(mysql -u root -p"$DB_PASS" -e "SHOW DATABASES LIKE '$DB_NAME';" 2>/dev/null | grep "$DB_NAME" || echo "")

if [ -z "$DB_EXISTS" ]; then
    echo "Creating database..."
    mysql -u root -p"$DB_PASS" <<EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF
    echo -e "${GREEN}✓ Database created${NC}"
else
    echo -e "${YELLOW}Database already exists, skipping creation${NC}"
fi

# Import schema
if [ -f "database/schema.sql" ]; then
    echo "Importing database schema..."
    mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < database/schema.sql
    echo -e "${GREEN}✓ Database schema imported${NC}"
else
    echo -e "${YELLOW}Warning: schema.sql not found, skipping import${NC}"
fi

echo ""
echo -e "${GREEN}Step 5: Updating configuration files...${NC}"

# Update database.php
if [ -f "config/database.php" ]; then
    sed -i "s/define('DB_HOST', '.*');/define('DB_HOST', 'localhost');/" config/database.php
    sed -i "s/define('DB_USER', '.*');/define('DB_USER', '$DB_USER');/" config/database.php
    sed -i "s/define('DB_PASS', '.*');/define('DB_PASS', '$DB_PASS');/" config/database.php
    sed -i "s/define('DB_NAME', '.*');/define('DB_NAME', '$DB_NAME');/" config/database.php
    echo -e "${GREEN}✓ Database configuration updated${NC}"
else
    echo -e "${RED}Error: config/database.php not found${NC}"
fi

# Update config.php
if [ -f "config/config.php" ]; then
    sed -i "s|define('BASE_URL', '.*');|define('BASE_URL', '$BASE_URL');|" config/config.php
    # Disable error display for production
    sed -i "s/ini_set('display_errors', 1);/ini_set('display_errors', 0);/" config/config.php
    sed -i "s/ini_set('display_startup_errors', 1);/ini_set('display_startup_errors', 0);/" config/config.php
    echo -e "${GREEN}✓ Application configuration updated${NC}"
else
    echo -e "${RED}Error: config/config.php not found${NC}"
fi

echo ""
echo -e "${GREEN}Step 6: Securing configuration files...${NC}"
chmod 600 config/database.php
chmod 600 config/config.php
echo -e "${GREEN}✓ Configuration files secured${NC}"

echo ""
echo -e "${GREEN}Step 7: Checking web server...${NC}"

# Check for Apache
if systemctl is-active --quiet apache2; then
    echo -e "${GREEN}Apache is running${NC}"
    echo "Checking if mod_rewrite is enabled..."
    if ! apache2ctl -M 2>/dev/null | grep -q rewrite_module; then
        echo "Enabling mod_rewrite..."
        a2enmod rewrite
        systemctl restart apache2
    fi
    echo -e "${GREEN}✓ Apache configured${NC}"
fi

# Check for Nginx
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}Nginx is running${NC}"
    echo -e "${YELLOW}Please configure Nginx virtual host manually${NC}"
fi

echo ""
echo -e "${GREEN}Step 8: Checking PHP requirements...${NC}"
PHP_VERSION=$(php -v | head -n 1 | cut -d " " -f 2 | cut -d "." -f 1,2)
echo "PHP Version: $PHP_VERSION"

# Check required PHP extensions
REQUIRED_EXTENSIONS=("mysqli" "gd" "mbstring")
MISSING_EXTENSIONS=()

for ext in "${REQUIRED_EXTENSIONS[@]}"; do
    if ! php -m | grep -q "$ext"; then
        MISSING_EXTENSIONS+=("$ext")
    fi
done

if [ ${#MISSING_EXTENSIONS[@]} -eq 0 ]; then
    echo -e "${GREEN}✓ All required PHP extensions are installed${NC}"
else
    echo -e "${YELLOW}Warning: Missing PHP extensions: ${MISSING_EXTENSIONS[*]}${NC}"
    echo "Install them with: apt-get install php${PHP_VERSION}-mysqli php${PHP_VERSION}-gd php${PHP_VERSION}-mbstring"
fi

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Visit: $BASE_URL"
echo "2. Login with:"
echo "   Email: sidhykqatar@gmail.com"
echo "   Password: tz669933"
echo ""
echo "3. Change the default password after first login"
echo "4. Remove or secure setup.php file"
echo ""
echo -e "${YELLOW}⚠️  Remember to configure your web server virtual host if not done automatically${NC}"
echo ""

