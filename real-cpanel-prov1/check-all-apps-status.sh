#!/bin/bash
# Check status of all applications on VPS
# Run this on VPS

echo "=========================================="
echo "Checking All Applications Status"
echo "=========================================="
echo ""

# List of applications
APPS=("realestate" "rashid" "safeway1" "safeway" "newsabra" "sabra" "sabra1" "sabra2" "sabra3" "sabra4" "sabra5" "sabra6" "gms" "gms1" "pos" "pos1" "resto1" "resto2" "raha" "rahacool" "rahacool1" "rahacoolv1" "garage-system" "garage-system-2" "garage-system-3" "garage-system-10" "focus")

echo "1. Checking application directories..."
cd /var/www/html
for APP in "${APPS[@]}"; do
    if [ -d "$APP" ]; then
        echo "   ✓ $APP exists"
        
        # Check if it has config files
        if [ -f "$APP/config/database.php" ] || [ -f "$APP/config/config.php" ]; then
            echo "      - Has config files"
        fi
        
        # Check database name from config if possible
        if [ -f "$APP/config/database.php" ]; then
            DB_NAME=$(grep "DB_NAME" "$APP/config/database.php" | grep -oP "(?<== ['\"]).*?(?=['\"])" | head -1)
            if [ ! -z "$DB_NAME" ]; then
                echo "      - Database: $DB_NAME"
            fi
        fi
    else
        echo "   ✗ $APP not found"
    fi
done
echo ""

echo "2. Checking database access for user 'sidhyk'..."
mysql -u sidhyk -p'Tz#669933' -e "SHOW DATABASES;" 2>/dev/null | grep -v "Database\|information_schema\|performance_schema\|mysql\|sys"
echo ""

echo "3. Checking Apache virtual hosts..."
ls -la /etc/apache2/sites-available/ | grep -E "\.conf$" | awk '{print $9}'
echo ""

echo "4. Checking enabled sites..."
ls -la /etc/apache2/sites-enabled/ | grep -E "\.conf$" | awk '{print $9}'
echo ""

echo "5. Recent Apache errors (last 20 lines)..."
tail -20 /var/log/apache2/error.log | grep -E "error|Error|ERROR|fatal|Fatal|FATAL" | tail -10
echo ""

echo "=========================================="
echo "Done!"
echo "=========================================="


