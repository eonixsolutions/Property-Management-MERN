#!/bin/bash

# Script to update domain from rs.big4financialservice.com to realestate.fmcqatar.com
# Run this script on the VPS server

echo "=========================================="
echo "Domain Update Script"
echo "Changing from rs.big4financialservice.com to realestate.fmcqatar.com"
echo "=========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Detect web server
if systemctl is-active --quiet apache2; then
    WEBSERVER="apache2"
    CONFIG_DIR="/etc/apache2/sites-available"
    ENABLE_CMD="a2ensite"
    RESTART_CMD="systemctl restart apache2"
elif systemctl is-active --quiet nginx; then
    WEBSERVER="nginx"
    CONFIG_DIR="/etc/nginx/sites-available"
    ENABLE_CMD=""
    RESTART_CMD="systemctl restart nginx"
else
    echo "Error: Neither Apache nor Nginx is running"
    exit 1
fi

echo "Detected web server: $WEBSERVER"
echo ""

# Find and update Apache virtual host files
if [ "$WEBSERVER" = "apache2" ]; then
    echo "Searching for Apache virtual host configurations..."
    
    # Find all virtual host files
    for config_file in $CONFIG_DIR/*.conf; do
        if [ -f "$config_file" ]; then
            if grep -q "rs.big4financialservice.com" "$config_file" 2>/dev/null; then
                echo "Found old domain in: $config_file"
                echo "Backing up to: ${config_file}.backup"
                cp "$config_file" "${config_file}.backup"
                
                # Replace domain
                sed -i 's/rs\.big4financialservice\.com/realestate.fmcqatar.com/g' "$config_file"
                sed -i 's/www\.rs\.big4financialservice\.com/www.realestate.fmcqatar.com/g' "$config_file"
                
                echo "Updated: $config_file"
            fi
        fi
    done
    
    # Also check sites-enabled
    for config_file in /etc/apache2/sites-enabled/*.conf; do
        if [ -f "$config_file" ]; then
            if grep -q "rs.big4financialservice.com" "$config_file" 2>/dev/null; then
                echo "Found old domain in enabled site: $config_file"
                echo "Backing up to: ${config_file}.backup"
                cp "$config_file" "${config_file}.backup"
                
                # Replace domain
                sed -i 's/rs\.big4financialservice\.com/realestate.fmcqatar.com/g' "$config_file"
                sed -i 's/www\.rs\.big4financialservice\.com/www.realestate.fmcqatar.com/g' "$config_file"
                
                echo "Updated: $config_file"
            fi
        fi
    done
    
    # Test Apache configuration
    echo ""
    echo "Testing Apache configuration..."
    apache2ctl configtest
    
    if [ $? -eq 0 ]; then
        echo "Configuration test passed!"
        echo "Restarting Apache..."
        $RESTART_CMD
        echo "Apache restarted successfully!"
    else
        echo "ERROR: Apache configuration test failed!"
        echo "Please check the configuration files manually."
        exit 1
    fi

# Find and update Nginx configuration files
elif [ "$WEBSERVER" = "nginx" ]; then
    echo "Searching for Nginx configuration files..."
    
    # Find all nginx site files
    for config_file in $CONFIG_DIR/*; do
        if [ -f "$config_file" ] && [ ! -L "$config_file" ]; then
            if grep -q "rs.big4financialservice.com" "$config_file" 2>/dev/null; then
                echo "Found old domain in: $config_file"
                echo "Backing up to: ${config_file}.backup"
                cp "$config_file" "${config_file}.backup"
                
                # Replace domain
                sed -i 's/rs\.big4financialservice\.com/realestate.fmcqatar.com/g' "$config_file"
                sed -i 's/www\.rs\.big4financialservice\.com/www.realestate.fmcqatar.com/g' "$config_file"
                
                echo "Updated: $config_file"
            fi
        fi
    done
    
    # Test Nginx configuration
    echo ""
    echo "Testing Nginx configuration..."
    nginx -t
    
    if [ $? -eq 0 ]; then
        echo "Configuration test passed!"
        echo "Restarting Nginx..."
        $RESTART_CMD
        echo "Nginx restarted successfully!"
    else
        echo "ERROR: Nginx configuration test failed!"
        echo "Please check the configuration files manually."
        exit 1
    fi
fi

# Update application config if it exists
if [ -f "/var/www/html/realestate/config/config.php" ]; then
    echo ""
    echo "Checking application config file..."
    if grep -q "rs.big4financialservice.com" "/var/www/html/realestate/config/config.php" 2>/dev/null; then
        echo "Updating config/config.php..."
        sed -i 's|rs\.big4financialservice\.com|realestate.fmcqatar.com|g' "/var/www/html/realestate/config/config.php"
        echo "Updated config/config.php"
    else
        echo "config/config.php already has correct domain"
    fi
fi

echo ""
echo "=========================================="
echo "Domain update completed!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Update DNS records to point realestate.fmcqatar.com to 104.237.2.52"
echo "2. Configure SSL certificate for the new domain"
echo "3. Test the site: https://realestate.fmcqatar.com"
echo ""
echo "To configure SSL with Let's Encrypt:"
if [ "$WEBSERVER" = "apache2" ]; then
    echo "  certbot --apache -d realestate.fmcqatar.com -d www.realestate.fmcqatar.com"
elif [ "$WEBSERVER" = "nginx" ]; then
    echo "  certbot --nginx -d realestate.fmcqatar.com -d www.realestate.fmcqatar.com"
fi
echo ""

