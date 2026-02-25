# Update Domain on VPS - Quick Guide

## Current Setup
- **Old Domain:** rs.big4financialservice.com
- **New Domain:** realestate.fmcqatar.com
- **VPS IP:** 104.237.2.52
- **Project Path:** /var/www/html/realestate

## Quick Update Steps

### Option 1: Automated Script (Recommended)

1. **Transfer the script to VPS:**
   ```bash
   scp update-domain-vps.sh root@104.237.2.52:/root/
   ```

2. **SSH into VPS:**
   ```bash
   ssh root@104.237.2.52
   ```

3. **Make script executable and run:**
   ```bash
   chmod +x /root/update-domain-vps.sh
   /root/update-domain-vps.sh
   ```

### Option 2: Manual Update

#### For Apache:

1. **SSH into VPS:**
   ```bash
   ssh root@104.237.2.52
   ```

2. **Find the virtual host file:**
   ```bash
   grep -r "rs.big4financialservice.com" /etc/apache2/sites-available/
   grep -r "rs.big4financialservice.com" /etc/apache2/sites-enabled/
   ```

3. **Edit the virtual host file:**
   ```bash
   nano /etc/apache2/sites-available/[filename].conf
   ```

4. **Replace all occurrences:**
   - `rs.big4financialservice.com` → `realestate.fmcqatar.com`
   - `www.rs.big4financialservice.com` → `www.realestate.fmcqatar.com`

5. **Test and restart:**
   ```bash
   apache2ctl configtest
   systemctl restart apache2
   ```

#### For Nginx:

1. **SSH into VPS:**
   ```bash
   ssh root@104.237.2.52
   ```

2. **Find the configuration file:**
   ```bash
   grep -r "rs.big4financialservice.com" /etc/nginx/sites-available/
   ```

3. **Edit the configuration file:**
   ```bash
   nano /etc/nginx/sites-available/[filename]
   ```

4. **Replace all occurrences:**
   - `rs.big4financialservice.com` → `realestate.fmcqatar.com`
   - `www.rs.big4financialservice.com` → `www.realestate.fmcqatar.com`

5. **Test and restart:**
   ```bash
   nginx -t
   systemctl restart nginx
   ```

## Verify Application Config

The application config file should already be correct, but verify:

```bash
cd /var/www/html/realestate
grep BASE_URL config/config.php
```

Should show:
```php
define('BASE_URL', 'https://realestate.fmcqatar.com');
```

If it shows the old domain, update it:
```bash
sed -i 's|rs\.big4financialservice\.com|realestate.fmcqatar.com|g' config/config.php
```

## DNS Configuration

**Important:** Update your DNS records to point the new domain to the VPS:

1. Add an A record:
   - **Name:** `realestate` (or `@` for root domain)
   - **Type:** A
   - **Value:** `104.237.2.52`
   - **TTL:** 3600 (or default)

2. Add CNAME for www (optional):
   - **Name:** `www`
   - **Type:** CNAME
   - **Value:** `realestate.fmcqatar.com`
   - **TTL:** 3600

## SSL Certificate Setup

After DNS is updated, configure SSL:

### For Apache:
```bash
apt-get install certbot python3-certbot-apache
certbot --apache -d realestate.fmcqatar.com -d www.realestate.fmcqatar.com
```

### For Nginx:
```bash
apt-get install certbot python3-certbot-nginx
certbot --nginx -d realestate.fmcqatar.com -d www.realestate.fmcqatar.com
```

## Test the Site

1. Wait for DNS propagation (can take a few minutes to 48 hours)
2. Visit: `https://realestate.fmcqatar.com`
3. Verify it loads correctly

## Troubleshooting

### Can't access the site:
- Check DNS propagation: `nslookup realestate.fmcqatar.com`
- Verify web server is running: `systemctl status apache2` or `systemctl status nginx`
- Check firewall: `ufw status`
- Check error logs: `tail -f /var/log/apache2/error.log` or `tail -f /var/log/nginx/error.log`

### SSL certificate issues:
- Make sure DNS is pointing correctly
- Ensure ports 80 and 443 are open
- Check certificate: `certbot certificates`

### Configuration errors:
- Check web server config test output
- Review backup files created by the script (`.backup` extension)
- Restore from backup if needed: `cp [file].backup [file]`

## Files That May Need Updates

1. **Apache Virtual Host:** `/etc/apache2/sites-available/[site].conf`
2. **Nginx Config:** `/etc/nginx/sites-available/[site]`
3. **Application Config:** `/var/www/html/realestate/config/config.php` (already correct)

---

**Note:** The application config file (`config/config.php`) already has the correct domain configured. You mainly need to update the web server virtual host configuration.

