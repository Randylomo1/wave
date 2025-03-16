// Main application functionality
class App {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeComponents();
        this.setupMobileNavigation();
        this.setupPWA();
    }

    setupEventListeners() {
        // Form submissions
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', this.handleFormSubmit.bind(this));
        });

        // Dynamic content loading
        document.querySelectorAll('[data-load-url]').forEach(element => {
            element.addEventListener('click', this.loadContent.bind(this));
        });
    }

    initializeComponents() {
        // Initialize tooltips
        this.initTooltips();
        // Initialize modals
        this.initModals();
        // Initialize form validation
        this.initFormValidation();
    }

    setupMobileNavigation() {
        const menuButton = document.createElement('button');
        menuButton.className = 'menu-toggle';
        menuButton.innerHTML = '<span></span><span></span><span></span>';
        
        const navbar = document.querySelector('.navbar .container');
        const navLinks = document.querySelector('.nav-links');
        
        if (navbar && navLinks) {
            navbar.insertBefore(menuButton, navLinks);
            
            menuButton.addEventListener('click', () => {
                navLinks.classList.toggle('active');
                menuButton.classList.toggle('active');
            });

            // Close menu when clicking outside
            document.addEventListener('click', (event) => {
                if (!navbar.contains(event.target)) {
                    navLinks.classList.remove('active');
                    menuButton.classList.remove('active');
                }
            });
        }
    }

    setupPWA() {
        // Register service worker for PWA
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/static/js/service-worker.js')
                    .then(registration => {
                        console.log('ServiceWorker registration successful');
                    })
                    .catch(error => {
                        console.log('ServiceWorker registration failed:', error);
                    });
            });
        }

        // Handle PWA install prompt
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            const installButton = document.createElement('button');
            installButton.textContent = 'Install App';
            installButton.className = 'btn btn-primary';
            
            installButton.addEventListener('click', async () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    if (outcome === 'accepted') {
                        console.log('App installed');
                    }
                    deferredPrompt = null;
                }
            });
            
            const banner = document.getElementById('app-install-banner');
            if (banner) {
                banner.querySelector('.banner-buttons').prepend(installButton);
            }
        });
    }

    handleFormSubmit(event) {
        const form = event.target;
        if (form.hasAttribute('data-ajax-submit')) {
            event.preventDefault();
            this.handleAjaxSubmit(form);
        }
    }

    async handleAjaxSubmit(form) {
        const submitButton = form.querySelector('[type="submit"]');
        const formData = new FormData(form);

        try {
            submitButton.disabled = true;
            const response = await fetch(form.action, {
                method: form.method,
                body: formData,
                headers: {
                    'X-CSRFToken': this.getCsrfToken(),
                },
            });

            if (!response.ok) throw new Error('Form submission failed');

            const result = await response.json();
            this.showNotification('success', result.message || 'Success!');
            
            if (result.redirect) {
                window.location.href = result.redirect;
            }
        } catch (error) {
            this.showNotification('error', error.message);
        } finally {
            submitButton.disabled = false;
        }
    }

    initTooltips() {
        document.querySelectorAll('[data-tooltip]').forEach(element => {
            element.addEventListener('mouseenter', (e) => {
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = element.getAttribute('data-tooltip');
                document.body.appendChild(tooltip);

                const rect = element.getBoundingClientRect();
                tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;
                tooltip.style.left = `${rect.left + (rect.width - tooltip.offsetWidth) / 2}px`;

                element.addEventListener('mouseleave', () => tooltip.remove());
            });
        });
    }

    initModals() {
        document.querySelectorAll('[data-modal-trigger]').forEach(trigger => {
            trigger.addEventListener('click', () => {
                const modalId = trigger.getAttribute('data-modal-trigger');
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            });
        });

        document.querySelectorAll('.modal-close').forEach(close => {
            close.addEventListener('click', () => {
                const modal = close.closest('.modal');
                if (modal) {
                    modal.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        });
    }

    initFormValidation() {
        document.querySelectorAll('form[data-validate]').forEach(form => {
            form.addEventListener('submit', (event) => {
                if (!form.checkValidity()) {
                    event.preventDefault();
                    this.showFormErrors(form);
                }
            });

            form.querySelectorAll('input, select, textarea').forEach(field => {
                field.addEventListener('input', () => {
                    this.validateField(field);
                });
            });
        });
    }

    validateField(field) {
        const errorElement = field.nextElementSibling;
        if (field.checkValidity()) {
            field.classList.remove('invalid');
            if (errorElement?.classList.contains('error-message')) {
                errorElement.remove();
            }
        } else {
            field.classList.add('invalid');
            if (!errorElement?.classList.contains('error-message')) {
                const error = document.createElement('div');
                error.className = 'error-message';
                error.textContent = field.validationMessage;
                field.parentNode.insertBefore(error, field.nextSibling);
            }
        }
    }

    showFormErrors(form) {
        form.querySelectorAll('input, select, textarea').forEach(field => {
            this.validateField(field);
        });
    }

    async loadContent(event) {
        const element = event.target;
        const url = element.getAttribute('data-load-url');
        const target = document.querySelector(element.getAttribute('data-target'));

        if (!url || !target) return;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Content loading failed');
            
            const html = await response.text();
            target.innerHTML = html;
        } catch (error) {
            this.showNotification('error', error.message);
        }
    }

    showNotification(type, message) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]').value;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new App();
}); 