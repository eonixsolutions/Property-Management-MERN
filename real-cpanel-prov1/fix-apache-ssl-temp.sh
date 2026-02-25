#!/bin/bash

# Temporary fix: Disable SSL site until certificates are obtained
# Then we'll get new SSL certificates with certbot

echo "Temporarily disabling SSL site..."
a2dissite realestate-ssl.conf

echo "Testing Apache configuration..."
apache2ctl configtest

if [ $? -eq 0 ]; then
    echo "Configuration test passed!"
    echo "Restarting Apache..."
    systemctl restart apache2
    echo "Apache restarted successfully!"
    echo ""
    echo "HTTP site should now be working."
    echo ""
    echo "Next: Get SSL certificates with:"
    echo "  certbot --apache -d realestate.fmcqatar.com -d www.realestate.fmcqatar.com"
    echo ""
    echo "After getting certificates, re-enable SSL site:"
    echo "  a2ensite realestate-ssl.conf"
    echo "  systemctl restart apache2"
else
    echo "ERROR: Configuration test failed!"
    echo "Please check the configuration manually."
fi

