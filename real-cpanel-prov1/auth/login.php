<?php
require_once '../config/config.php';

// Redirect if already logged in
if (isLoggedIn()) {
    header('Location: ' . BASE_URL . '/index.php');
    exit();
}

$error = '';
$timeout_message = '';

// Check if redirected due to session timeout
if (isset($_GET['timeout']) && $_GET['timeout'] == '1') {
    $timeout_message = 'Your session has expired due to inactivity. Please log in again.';
}

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $email = sanitizeInput($_POST['email']);
    $password = $_POST['password'];
    
    if (empty($email) || empty($password)) {
        $error = 'Please fill in all fields';
    } else {
        $conn = getDBConnection();
        $stmt = $conn->prepare("SELECT id, email, password, first_name, last_name FROM users WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows == 1) {
            $user = $result->fetch_assoc();
            
            // Check password (allows plain text for demo user, otherwise use password_verify)
            if ($user['email'] === 'sidhykqatar@gmail.com' && $password === 'tz669933') {
                // Demo user - plain text check
                $password_valid = true;
            } else {
                // Regular users - verify hash
                $password_valid = password_verify($password, $user['password']);
            }
            
            if ($password_valid) {
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['user_email'] = $user['email'];
                $_SESSION['user_name'] = $user['first_name'] . ' ' . $user['last_name'];
                $_SESSION['last_activity'] = time(); // Initialize last activity time
                
                // Load user role
                $role_result = $conn->query("SELECT role FROM users WHERE id = " . $user['id'] . " LIMIT 1");
                if ($role_result && $role_result->num_rows > 0) {
                    $role_data = $role_result->fetch_assoc();
                    $_SESSION['user_role'] = $role_data['role'] ?? 'User';
                } else {
                    $_SESSION['user_role'] = 'User'; // Default role
                }
                
                // Load user currency settings
                $settings_result = $conn->query("SELECT currency FROM settings WHERE user_id = " . $user['id'] . " LIMIT 1");
                if ($settings_result && $settings_result->num_rows > 0) {
                    $user_settings = $settings_result->fetch_assoc();
                    $_SESSION['user_currency'] = !empty($user_settings['currency']) ? $user_settings['currency'] : 'QAR';
                } else {
                    $_SESSION['user_currency'] = 'QAR'; // Default to QAR
                }
                
                header('Location: ' . BASE_URL . '/index.php');
                exit();
            } else {
                $error = 'Invalid email or password';
            }
        } else {
            $error = 'Invalid email or password';
        }
        
        $stmt->close();
        closeDBConnection($conn);
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Real Estate Management</title>
    <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body class="auth-page">
    <div class="login-background">
        <div class="gradient-overlay"></div>
        <div class="geometric-shapes">
            <div class="shape shape-1"></div>
            <div class="shape shape-2"></div>
            <div class="shape shape-3"></div>
        </div>
    </div>
    
    <div class="login-container">
        <div class="login-form-wrapper">
            <!-- Logo -->
            <div class="login-logo">
                <div class="logo-icon-box">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="6" y="16" width="28" height="20" rx="3" fill="url(#gradient)"/>
                        <rect x="9" y="19" width="7" height="5" rx="1" fill="#ffffff"/>
                        <rect x="18" y="19" width="7" height="5" rx="1" fill="#ffffff"/>
                        <rect x="27" y="19" width="7" height="5" rx="1" fill="#ffffff"/>
                        <rect x="9" y="26" width="7" height="5" rx="1" fill="#ffffff"/>
                        <rect x="18" y="26" width="7" height="5" rx="1" fill="#ffffff"/>
                        <rect x="27" y="26" width="7" height="5" rx="1" fill="#ffffff"/>
                        <path d="M20 6L25 11H22V16H18V11H15L20 6Z" fill="#ffffff"/>
                        <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
                                <stop offset="100%" style="stop-color:#4f46e5;stop-opacity:1" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
                <span class="logo-text">RealEstate</span>
            </div>

            <!-- Login Header -->
            <div class="login-header">
                <h2 class="login-title">Welcome Back</h2>
                <p class="login-subtitle">Sign in to continue to your account</p>
            </div>

            <!-- Error Messages -->
            <?php if ($timeout_message): ?>
                <div class="alert alert-warning">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                    </svg>
                    <?php echo htmlspecialchars($timeout_message); ?>
                </div>
            <?php endif; ?>
            
            <?php if ($error): ?>
                <div class="alert alert-error">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                    </svg>
                    <?php echo htmlspecialchars($error); ?>
                </div>
            <?php endif; ?>

            <!-- Login Form -->
            <form method="POST" action="" class="login-form" id="loginForm">
                <div class="form-group">
                    <label for="email">
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                        </svg>
                        Email Address
                    </label>
                    <input type="email" id="email" name="email" required value="<?php echo isset($_POST['email']) ? htmlspecialchars($_POST['email']) : 'sidhykqatar@gmail.com'; ?>" placeholder="Enter your email">
                </div>
                
                <div class="form-group">
                    <label for="password">
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
                        </svg>
                        Password
                    </label>
                    <input type="password" id="password" name="password" required placeholder="Enter your password">
                    <button type="button" class="password-toggle" id="passwordToggle" aria-label="Toggle password visibility">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" class="eye-icon">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                            <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
                        </svg>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" class="eye-off-icon" style="display: none;">
                            <path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.907 1.285L3.707 2.293zM1.38 6.415L5.07 9.105A4 4 0 008.895 12.93l2.62 2.62A4 4 0 0015.93 10.93L18.62 13.62a1 1 0 11-1.414 1.414l-14-14a1 1 0 010-1.414zM9 13a4 4 0 01-4-4c0-.173.013-.34.038-.5l5.962 5.962A3.982 3.982 0 019 13zm6.93-2.07l-5.86-5.86A4 4 0 0115.93 10.93z" clip-rule="evenodd"/>
                        </svg>
                    </button>
                </div>
                
                <div class="form-options">
                    <label class="remember-me">
                        <input type="checkbox" name="remember" id="remember">
                        <span>Remember me</span>
                    </label>
                    <a href="#" class="forgot-password">Forgot password?</a>
                </div>
                
                <button type="submit" class="btn-login">
                    <span>Sign In</span>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" class="btn-icon">
                        <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
                    </svg>
                </button>
            </form>

            <!-- Footer Links -->
            <div class="login-footer">
                <p class="footer-text">Don't have an account? <a href="#" class="signup-link">Contact Administrator</a></p>
                <div class="footer-links">
                    <a href="#">Privacy Policy</a>
                    <span>•</span>
                    <a href="#">Terms of Service</a>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Form submission animation
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', function(e) {
                const submitBtn = this.querySelector('.btn-login');
                if (submitBtn) {
                    submitBtn.classList.add('loading');
                    submitBtn.disabled = true;
                    submitBtn.querySelector('span').textContent = 'Signing in...';
                }
            });
        }

        // Password toggle
        const passwordToggle = document.getElementById('passwordToggle');
        const passwordInput = document.getElementById('password');
        if (passwordToggle && passwordInput) {
            passwordToggle.addEventListener('click', function() {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                
                const eyeIcon = this.querySelector('.eye-icon');
                const eyeOffIcon = this.querySelector('.eye-off-icon');
                
                if (type === 'password') {
                    eyeIcon.style.display = 'block';
                    eyeOffIcon.style.display = 'none';
                } else {
                    eyeIcon.style.display = 'none';
                    eyeOffIcon.style.display = 'block';
                }
            });
        }
    </script>
</body>
</html>
