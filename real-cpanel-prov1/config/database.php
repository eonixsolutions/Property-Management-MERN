<?php
// Database configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');  // XAMPP default is empty
define('DB_NAME', 'property_db');

// Global variable to store connection for reuse
$GLOBALS['db_connection'] = null;

// Create database connection (with reuse)
function getDBConnection() {
    // Reuse existing connection if available and valid
    if (isset($GLOBALS['db_connection']) && $GLOBALS['db_connection'] !== null) {
        try {
            // Check if connection is still alive
            if ($GLOBALS['db_connection']->ping()) {
                return $GLOBALS['db_connection'];
            }
        } catch (Exception $e) {
            // Connection is dead, will create new one
        }
    }
    
    // Close existing connection if invalid
    if (isset($GLOBALS['db_connection']) && $GLOBALS['db_connection'] !== null) {
        @$GLOBALS['db_connection']->close();
        $GLOBALS['db_connection'] = null;
    }
    
    try {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        
        if ($conn->connect_error) {
            // Check if it's a "too many connections" error
            if (strpos($conn->connect_error, 'Too many connections') !== false) {
                // Wait a bit and retry once
                sleep(1);
                $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
                if ($conn->connect_error) {
                    die("Database connection error: Too many connections. Please try again in a moment.");
                }
            } else {
                die("Connection failed: " . $conn->connect_error);
            }
        }
        
        // Set connection to use UTF8
        $conn->set_charset("utf8mb4");
        
        // Store connection for reuse
        $GLOBALS['db_connection'] = $conn;
        
        return $conn;
    } catch (Exception $e) {
        die("Database connection error: " . $e->getMessage());
    }
}

// Close database connection (only if not using persistent connection)
function closeDBConnection($conn = null) {
    // If specific connection provided, only close if it's not the cached one
    if ($conn !== null && isset($GLOBALS['db_connection']) && $conn === $GLOBALS['db_connection']) {
        // Don't close the cached connection - it will be reused
        return;
    }
    
    // Close specific connection if provided
    if ($conn !== null && $conn instanceof mysqli) {
        @$conn->close();
    }
    
    // Only clear cached connection on script end or explicit close_all call
    // This allows connection reuse across function calls
}

// Force close all connections (use at end of scripts)
function closeAllDBConnections() {
    if (isset($GLOBALS['db_connection']) && $GLOBALS['db_connection'] !== null) {
        try {
            if ($GLOBALS['db_connection'] instanceof mysqli) {
                // Check if connection is still valid before closing
                $conn = $GLOBALS['db_connection'];
                // Use thread_id to check if connection is still open
                if (property_exists($conn, 'thread_id') && $conn->thread_id !== null) {
                    @$conn->close();
                }
            }
        } catch (Exception $e) {
            // Connection already closed or invalid, ignore
        } catch (Error $e) {
            // Connection already closed or invalid, ignore
        } catch (Throwable $e) {
            // Catch any other errors, ignore
        }
        $GLOBALS['db_connection'] = null;
    }
}

// Register shutdown function to close connection at end of script
register_shutdown_function(function() {
    try {
    closeAllDBConnections();
    } catch (Exception $e) {
        // Ignore errors during shutdown
    } catch (Error $e) {
        // Ignore errors during shutdown
    }
});
?>
