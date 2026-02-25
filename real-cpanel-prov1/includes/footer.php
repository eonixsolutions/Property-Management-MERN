        </main>
    </div>
    <script src="<?php echo BASE_URL; ?>/assets/js/script.js"></script>
    <script>
    // Session timeout handling (10 minutes = 600000 milliseconds)
    (function() {
        var SESSION_TIMEOUT = 600000; // 10 minutes in milliseconds
        var WARNING_TIME = 540000; // 9 minutes (1 minute before timeout)
        var lastActivity = Date.now();
        var warningShown = false;
        var timeoutId = null;
        var warningTimeoutId = null;
        
        // Update last activity on user interaction
        function updateActivity() {
            lastActivity = Date.now();
            warningShown = false;
            
            // Clear existing timeouts
            if (timeoutId) clearTimeout(timeoutId);
            if (warningTimeoutId) clearTimeout(warningTimeoutId);
            
            // Set warning timeout (1 minute before session expires)
            var timeUntilWarning = WARNING_TIME - (Date.now() - lastActivity);
            if (timeUntilWarning > 0) {
                warningTimeoutId = setTimeout(showWarning, timeUntilWarning);
            }
            
            // Set logout timeout
            var timeUntilTimeout = SESSION_TIMEOUT - (Date.now() - lastActivity);
            if (timeUntilTimeout > 0) {
                timeoutId = setTimeout(logoutUser, timeUntilTimeout);
            }
        }
        
        function showWarning() {
            if (warningShown) return;
            warningShown = true;
            
            var timeLeft = Math.ceil((SESSION_TIMEOUT - (Date.now() - lastActivity)) / 1000);
            var minutes = Math.floor(timeLeft / 60);
            var seconds = timeLeft % 60;
            
            if (confirm('Your session will expire in ' + minutes + ' minute(s) due to inactivity. Click OK to stay logged in, or Cancel to logout now.')) {
                // User wants to stay logged in - ping server to reset session
                fetch('<?php echo BASE_URL; ?>/auth/ping.php?t=' + Date.now())
                .then(function(response) {
                    if (response.ok) {
                        updateActivity();
                    } else {
                        // If ping fails, still reset local timer
                        updateActivity();
                    }
                })
                .catch(function() {
                    // If ping fails, still reset local timer
                    updateActivity();
                });
            } else {
                // User chose to logout
                window.location.href = '<?php echo BASE_URL; ?>/auth/logout.php';
            }
        }
        
        function logoutUser() {
            window.location.href = '<?php echo BASE_URL; ?>/auth/login.php?timeout=1';
        }
        
        // Track user activity
        var events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        events.forEach(function(event) {
            document.addEventListener(event, updateActivity, true);
        });
        
        // Initialize on page load
        updateActivity();
        
        // Also check periodically (every 30 seconds) to handle tab switching
        setInterval(function() {
            var timeSinceActivity = Date.now() - lastActivity;
            if (timeSinceActivity >= SESSION_TIMEOUT) {
                logoutUser();
            } else if (timeSinceActivity >= WARNING_TIME && !warningShown) {
                showWarning();
            }
        }, 30000);
    })();
    </script>
</body>
</html>
