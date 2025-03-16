// Import animation system
import AnimationSystem from './animations.js';

// Main Application
const App = {
    init() {
        this.initializeAnimations();
        this.setupEventListeners();
        this.initializeServiceWorker();
    },

    initializeAnimations() {
        AnimationSystem.init();
    },

    setupEventListeners() {
        // Add class to body when JavaScript is loaded
        document.body.classList.add('js-loaded');

        // Handle mobile menu toggle
        const menuToggle = document.querySelector('.menu-toggle');
        const navLinks = document.querySelector('.nav-links');
        
        if (menuToggle && navLinks) {
            menuToggle.addEventListener('click', () => {
                menuToggle.classList.toggle('active');
                navLinks.classList.toggle('active');
            });
        }

        // Handle smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Handle reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handleReducedMotion = (e) => {
            if (e.matches) {
                document.body.classList.add('reduced-motion');
            } else {
                document.body.classList.remove('reduced-motion');
            }
        };
        prefersReducedMotion.addEventListener('change', handleReducedMotion);
        handleReducedMotion(prefersReducedMotion);
    },

    initializeServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                        console.log('ServiceWorker registration successful');
                    })
                    .catch(err => {
                        console.log('ServiceWorker registration failed: ', err);
                    });
            });
        }
    }
};

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

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

// Utility functions
const utils = {
    getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]').value;
    },
    
    showToast(title, message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-header">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <strong>${title}</strong>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
            </div>
            <div class="toast-body">${message}</div>
        `;
        
        document.querySelector('.toast-container').appendChild(toast);
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }
};

// Navigation functionality
document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', function() {
            menuToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }

    // Hide navbar on scroll down, show on scroll up
    let lastScrollTop = 0;
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            navbar.classList.add('scroll-down');
            navbar.classList.remove('scroll-up');
        } else {
            navbar.classList.remove('scroll-down');
            navbar.classList.add('scroll-up');
        }
        
        lastScrollTop = scrollTop;
    });

    // Auto-hide notifications
    document.querySelectorAll('.notification').forEach(notification => {
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    });
});

// Form handling
document.addEventListener('DOMContentLoaded', function() {
    // Handle all forms with class 'ajax-form'
    document.querySelectorAll('form.ajax-form').forEach(form => {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitButton = form.querySelector('[type="submit"]');
            const originalText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            
            try {
                const response = await fetch(form.action, {
                    method: form.method,
                    body: new FormData(form),
                    headers: {
                        'X-CSRFToken': utils.getCsrfToken()
                    }
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    utils.showToast('Success', data.message, 'success');
                    if (data.redirect) {
                        window.location.href = data.redirect;
                    }
                } else {
                    utils.showToast('Error', data.error || 'An error occurred', 'error');
                }
            } catch (error) {
                utils.showToast('Error', 'An unexpected error occurred', 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
            }
        });
    });

    // Floating labels
    document.querySelectorAll('.form-floating input, .form-floating textarea').forEach(input => {
        const updateLabel = () => {
            const label = input.nextElementSibling;
            if (label && label.tagName === 'LABEL') {
                if (input.value) {
                    label.classList.add('active');
                } else {
                    label.classList.remove('active');
                }
            }
        };

        input.addEventListener('input', updateLabel);
        input.addEventListener('focus', updateLabel);
        input.addEventListener('blur', updateLabel);
        
        // Initial state
        updateLabel();
    });
});

// Loading overlay
const loadingOverlay = {
    show(message = 'Processing...') {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            const textElement = overlay.querySelector('.loading-text');
            if (textElement) {
                textElement.textContent = message;
            }
            overlay.classList.add('active');
        }
    },
    
    hide() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }
};

// Page transitions
document.addEventListener('DOMContentLoaded', function() {
    document.body.classList.add('page-transition');
});

// Handle quantity inputs
function updateQuantity(inputId, change) {
    const input = document.getElementById(inputId);
    if (input) {
        const currentValue = parseInt(input.value);
        const maxStock = parseInt(input.getAttribute('max'));
        const newValue = Math.max(1, Math.min(currentValue + change, maxStock));
        input.value = newValue;
        
        // Trigger change event
        const event = new Event('change', { bubbles: true });
        input.dispatchEvent(event);
    }
}

// Animation Handlers
const animationManager = {
    init() {
        this.setupIntersectionObserver();
        this.setupLinkTransitions();
        this.setupButtonEffects();
    },

    setupIntersectionObserver() {
        const options = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                    observer.unobserve(entry.target);
                }
            });
        }, options);

        // Observe elements with animation classes
        document.querySelectorAll('.animate-on-scroll').forEach(el => {
            observer.observe(el);
        });
    },

    setupLinkTransitions() {
        document.querySelectorAll('a:not([target="_blank"]):not([href^="#"])').forEach(link => {
            link.addEventListener('click', (e) => {
                if (link.href && link.href.indexOf(window.location.origin) === 0) {
                    e.preventDefault();
                    document.body.classList.add('page-transition-out');
                    
                    setTimeout(() => {
                        window.location.href = link.href;
                    }, 300);
                }
            });
        });

        // Add page transition class on load
        window.addEventListener('load', () => {
            document.body.classList.add('page-transition-in');
        });
    },

    setupButtonEffects() {
        document.querySelectorAll('.btn-ripple').forEach(button => {
            button.addEventListener('click', function(e) {
                const rect = this.getBoundingClientRect();
                const ripple = document.createElement('div');
                
                ripple.className = 'ripple';
                ripple.style.left = `${e.clientX - rect.left}px`;
                ripple.style.top = `${e.clientY - rect.top}px`;
                
                this.appendChild(ripple);
                
                setTimeout(() => ripple.remove(), 1000);
            });
        });
    },

    showSuccessAnimation(container) {
        const checkmark = document.createElement('div');
        checkmark.className = 'checkmark';
        checkmark.innerHTML = `
            <svg class="checkmark__circle" viewBox="0 0 52 52">
                <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
        `;
        
        container.appendChild(checkmark);
        setTimeout(() => checkmark.remove(), 2000);
    }
};

// Initialize animations
document.addEventListener('DOMContentLoaded', () => {
    animationManager.init();
}); 