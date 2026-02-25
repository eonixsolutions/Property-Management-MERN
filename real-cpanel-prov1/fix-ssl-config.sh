#!/bin/bash

# Fix SSL configuration by commenting out certificate lines temporarily

SSL_CONFIG="/etc/apache2/sites-available/realestate-ssl.conf"

echo "Disabling SSL site..."
a2dissite realestate-ssl.conf

echo "Backing up SSL config..."
cp "$SSL_CONFIG" "${SSL_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

echo "Commenting out SSL certificate lines..."
# Comment out SSLCertificateFile and SSLCertificateKeyFile lines
sed -i 's/^\([[:space:]]*SSLCertificateFile\)/#\1/' "$SSL_CONFIG"
sed -i 's/^\([[:space:]]*SSLCertificateKeyFile\)/#\1/' "$SSL_CONFIG"

# Also comment out SSLCertificateChainFile if it exists
sed -i 's/^\([[:space:]]*SSLCertificateChainFile\)/#\1/' "$SSL_CONFIG"

echo "SSL certificate lines commented out."
echo ""
echo "You can now:"
echo "1. Enable SSL site: a2ensite realestate-ssl.conf"
echo "2. Test: apache2ctl configtest"
echo "3. Restart: systemctl restart apache2"
echo ""
echo "After DNS is configured, get certificates with:"
echo "  certbot --apache -d realestate.fmcqatar.com"
echo ""
echo "Then certbot will automatically uncomment and update the certificate paths."

