# Quick Start - cPanel Deployment

## 🚀 Ready for Production!

Your application has been configured for cPanel hosting at **fmcqatar.com**

## ✅ Configuration Complete

### Database Settings
- **Database:** `fmcqatar_realestate`
- **Username:** `fmcqatar_sidhyk`
- **Password:** `Tz@669933@`
- **Host:** `localhost`

### URL Configuration
- **Production URL:** `https://fmcqatar.com/realestate`
- **HTTPS:** Enabled with auto-redirect
- **Security:** Production-ready with error display disabled

## 📋 Deployment Checklist

### 1. Upload Files
Upload all files from this directory to:
```
public_html/realestate/
```

### 2. Database Setup
1. Go to phpMyAdmin in cPanel
2. Select database `fmcqatar_realestate`
3. Import `database/schema.sql`

### 3. Set Permissions
Set folder permissions:
- All folders: **755**
- All files: **644**
- `uploads/` folder: **755** (must be writable)

### 4. Test
Visit: `https://fmcqatar.com/realestate`

**Login:**
- Email: `sidhykqatar@gmail.com`
- Password: `tz669933`

## 🛡️ Security Features Enabled

✅ HTTPS redirect  
✅ Secure session cookies  
✅ Error display disabled  
✅ Sensitive file protection  
✅ Security headers  
✅ Directory listing disabled  

## 📝 Important Notes

- Delete `setup.php` after successful deployment
- Keep backup of `config/database.php`
- Enable backups in cPanel
- Monitor error logs

## 🆘 Quick Troubleshooting

**Database Error?**  
→ Check credentials in `config/database.php`

**500 Error?**  
→ Check `uploads/` folder permissions (should be 755)

**Can't Login?**  
→ Verify database is imported correctly

**File Upload Fails?**  
→ Ensure `uploads/` is writable (755 permission)

## 📚 Full Documentation

See `DEPLOYMENT.md` for complete deployment guide.

---

**Status:** ✅ Ready to Deploy  
**URL:** https://fmcqatar.com/realestate

