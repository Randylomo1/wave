// Main application functionality
class App {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeComponents();
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

    getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]').value;
    }

    showNotification(type, message) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new App();
}); 