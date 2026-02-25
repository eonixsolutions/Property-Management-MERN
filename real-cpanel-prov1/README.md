# Real Estate Management System

A comprehensive PHP and MySQL-based property management system similar to Landlord Studio.

## Features

- **Dashboard**: Overview with statistics and recent activity
- **Properties Management**: Add, edit, view, and manage properties
- **Tenants Management**: Track tenant information and lease details
- **Rent Collection**: Monitor and track rent payments
- **Income & Expenses**: Record and track all financial transactions
- **Maintenance Requests**: Manage maintenance and repair requests
- **Reports & Analytics**: Generate financial reports and property performance analytics
- **Documents**: Upload and manage property-related documents
- **Settings**: Customize system preferences

## Installation

1. **Database Setup**:
   - Import the database schema from `database/schema.sql` into your MySQL database
   - Update database credentials in `config/database.php`

2. **Configuration**:
   - Update `BASE_URL` in `config/config.php` to match your installation path
   - Default login credentials:
     - Email: `sidhykqatar@gmail.com`
     - Password: `tz669933`

3. **Directory Permissions**:
   - Ensure `uploads/` directory exists and is writable for document uploads

## Requirements

- PHP 7.4 or higher
- MySQL 5.7 or higher
- Apache/Nginx web server
- Modern web browser

## File Structure

```
realestate/
├── assets/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── script.js
├── auth/
│   ├── login.php
│   ├── register.php
│   └── logout.php
├── config/
│   ├── config.php
│   └── database.php
├── database/
│   └── schema.sql
├── documents/
├── includes/
│   ├── header.php
│   └── footer.php
├── maintenance/
├── properties/
├── rent/
├── reports/
├── settings/
├── tenants/
├── transactions/
├── documents/
└── index.php
```

## Usage

1. Access the login page: `http://localhost/realestate/auth/login.php`
2. Login with the default credentials or register a new account
3. Navigate through the system using the sidebar menu
4. Start by adding properties, then tenants, and track your financials

## Security Notes

- Change default admin password after first login
- Keep database credentials secure
- Regularly backup your database
- Use HTTPS in production environments

## Support

For issues or questions, please check the code comments or create an issue in the repository.
