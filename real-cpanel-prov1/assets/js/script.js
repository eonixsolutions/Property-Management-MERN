// Real Estate Management System - Main JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips, modals, etc.
    initializeComponents();
    initializeNotifications();
});

function initializeComponents() {
    // Add any interactive components here
    console.log('Real Estate Management System loaded');
}

function initializeNotifications() {
    // Close notifications when clicking outside
    document.addEventListener('click', function(event) {
        const notificationBtn = document.getElementById('notificationBtn');
        const notificationDropdown = document.getElementById('notificationDropdown');
        
        if (notificationBtn && notificationDropdown) {
            if (!notificationBtn.contains(event.target) && !notificationDropdown.contains(event.target)) {
                notificationDropdown.classList.remove('show');
            }
        }
    });
}

function toggleNotifications() {
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Confirmation dialogs
function confirmDelete(message) {
    return confirm(message || 'Are you sure you want to delete this item?');
}

// Format currency (client-side)
function formatCurrency(amount) {
    return '$' + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// Format date (client-side)
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}
