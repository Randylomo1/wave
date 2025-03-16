// Main JavaScript functionality
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all components
    initializeNavigation();
    initializeNotifications();
    initializeAppInstallBanner();
    initializeFormValidation();
});

// Navigation functionality
function initializeNavigation() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!menuToggle.contains(e.target) && !navLinks.contains(e.target)) {
                navLinks.classList.remove('active');
                menuToggle.classList.remove('active');
            }
        });
    }
}

// Notification system
class NotificationManager {
    static show(message, type = 'info', duration = 5000) {
        const notifications = document.querySelector('.messages') || (() => {
            const div = document.createElement('div');
            div.className = 'messages';
            document.body.appendChild(div);
            return div;
        })();

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        notifications.appendChild(notification);

        // Remove notification after duration
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
}

function initializeNotifications() {
    // Initialize any existing notifications
    document.querySelectorAll('.notification').forEach(notification => {
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    });
}

// App Install Banner
function initializeAppInstallBanner() {
    let deferredPrompt;
    const banner = document.querySelector('.banner');
    const installButtons = document.querySelectorAll('.install-app');

    // Hide banner initially
    if (banner) {
        banner.style.display = 'none';
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;

        // Show banner if not installed
        if (banner) {
            banner.style.display = 'block';
        }
    });

    installButtons.forEach(button => {
        button.addEventListener('click', async () => {
            if (!deferredPrompt) return;

            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                NotificationManager.show('App installation started', 'success');
                if (banner) {
                    banner.style.display = 'none';
                }
            }

            deferredPrompt = null;
        });
    });
}

// Form validation
function initializeFormValidation() {
    const forms = document.querySelectorAll('form');

    forms.forEach(form => {
        form.addEventListener('submit', async (e) => {
            if (!form.checkValidity()) {
                e.preventDefault();
                e.stopPropagation();
                highlightInvalidFields(form);
            }
            form.classList.add('was-validated');
        });

        // Real-time validation
        form.querySelectorAll('input, select, textarea').forEach(field => {
            field.addEventListener('blur', () => {
                validateField(field);
            });
        });
    });
}

function validateField(field) {
    const isValid = field.checkValidity();
    field.classList.toggle('is-invalid', !isValid);
    field.classList.toggle('is-valid', isValid);

    // Show validation message
    const feedback = field.nextElementSibling;
    if (feedback && feedback.classList.contains('invalid-feedback')) {
        feedback.textContent = field.validationMessage;
    }
}

function highlightInvalidFields(form) {
    form.querySelectorAll('input, select, textarea').forEach(field => {
        validateField(field);
    });
}

// CSRF Token handling
function getCsrfToken() {
    const token = document.querySelector('[name=csrfmiddlewaretoken]');
    return token ? token.value : null;
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(date));
}

// Export utilities for use in other modules
window.utils = {
    NotificationManager,
    getCsrfToken,
    debounce,
    formatCurrency,
    formatDate
}; 