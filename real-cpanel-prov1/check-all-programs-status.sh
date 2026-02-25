#!/bin/bash
# Comprehensive check of all programs and their database access
# Run this on VPS

echo "=========================================="
echo "Checking ALL Programs Status"
echo "=========================================="
echo ""

cd /var/www/html

# Find all directories (potential applications)
echo "1. Finding all application directories..."
APPS=$(ls -d */ 2>/dev/null | sed 's/\///g' | sort)

echo "   Found applications:"
for APP in $APPS; do
    echo "   - $APP"
done
echo ""

# Check each application
echo "2. Checking each application..."
for APP in $APPS; do
    echo "   === $APP ==="
    
    # Check if it has database config
    DB_CONFIG=""
    DB_NAME=""
    DB_USER_CONFIG=""
    
    if [ -f "$APP/config/database.php" ]; then
        DB_CONFIG="$APP/config/database.php"
        DB_NAME=$(grep -E "DB_NAME|database" "$DB_CONFIG" 2>/dev/null | grep -oP "(?<== ['\"]).*?(?=['\"])" | head -1)
        DB_USER_CONFIG=$(grep -E "DB_USER|username" "$DB_CONFIG" 2>/dev/null | grep -oP "(?<== ['\"]).*?(?=['\"])" | head -1)
    elif [ -f "$APP/config/config.php" ]; then
        DB_CONFIG="$APP/config/config.php"
        DB_NAME=$(grep -E "DB_NAME|database" "$DB_CONFIG" 2>/dev/null | grep -oP "(?<== ['\"]).*?(?=['\"])" | head -1)
        DB_USER_CONFIG=$(grep -E "DB_USER|username" "$DB_CONFIG" 2>/dev/null | grep -oP "(?<== ['\"])[^'\"]*?(?=['\"])" | head -1)
    fi
    
    if [ ! -z "$DB_NAME" ]; then
        echo "      Database: $DB_NAME"
        echo "      DB User: ${DB_USER_CONFIG:-not found}"
        
        # Test database access
        if [ ! -z "$DB_USER_CONFIG" ]; then
            # Try to get password from config (basic attempt)
            DB_PASS_CONFIG=$(grep -E "DB_PASS|password" "$DB_CONFIG" 2>/dev/null | grep -oP "(?<== ['\"]).*?(?=['\"])" | head -1)
            
            if [ ! -z "$DB_PASS_CONFIG" ]; then
                echo -n "      Access test: "
                mysql -u "$DB_USER_CONFIG" -p"$DB_PASS_CONFIG" -e "USE \`$DB_NAME\`; SELECT 1;" 2>/dev/null > /dev/null
                if [ $? -eq 0 ]; then
                    echo "✓ OK"
                else
                    echo "✗ FAILED"
                fi
            fi
        fi
    else
        echo "      No database config found"
    fi
    
    # Check for common files
    if [ -f "$APP/index.php" ] || [ -f "$APP/login.php" ]; then
        echo "      Has PHP files: ✓"
    fi
    
    echo ""
done

# Check all databases
echo "3. All databases in MySQL:"
mysql -u root -p'Tz@669933' -e "SHOW DATABASES;" 2>/dev/null | grep -vE "Database|information_schema|performance_schema|mysql|sys"
echo ""

# Check database users
echo "4. Database users:"
mysql -u root -p'Tz@669933' -e "SELECT User, Host FROM mysql.user WHERE User != 'root' AND User NOT LIKE 'mysql.%';" 2>/dev/null
echo ""

# Recent Apache errors
echo "5. Recent Apache errors (last 30 lines):"
tail -30 /var/log/apache2/error.log 2>/dev/null | grep -E "error|Error|ERROR|fatal|Fatal|FATAL|database|Database|access denied" | tail -10
echo ""

echo "=========================================="
echo "Done!"
echo "=========================================="

