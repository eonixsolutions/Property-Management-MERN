#!/bin/bash

# Remove/Disable SSL configuration

echo "Disabling SSL site..."
a2dissite realestate-http-le-ssl.conf

echo "Testing Apache configuration..."
apache2ctl configtest

if [ $? -eq 0 ]; then
    echo "Configuration test passed!"
    echo "Restarting Apache..."
    systemctl restart apache2
    echo ""
    echo "SSL site disabled. Site is now HTTP only."
    echo ""
    echo "The site will be accessible at: http://realestate.fmcqatar.com"
    echo ""
    echo "Note: If you want to re-enable SSL later, run:"
    echo "  a2ensite realestate-http-le-ssl.conf"
    echo "  systemctl restart apache2"
else
    echo "ERROR: Configuration test failed!"
    echo "Please check the configuration manually."
fi

