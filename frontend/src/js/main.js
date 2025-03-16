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

        // Infinite scroll
        this.setupInfiniteScroll();
    }

    initializeComponents() {
        // Initialize tooltips
        this.initTooltips();

        // Initialize modals
        this.initModals();

        // Initialize form validation
        this.initFormValidation();
    }

    async handleFormSubmit(event) {
        const form = event.target;
        if (form.hasAttribute('data-ajax-submit')) {
            event.preventDefault();
            await this.handleAjaxSubmit(form);
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

            if (!response.ok) {
                throw new Error('Form submission failed');
            }

            const result = await response.json();
            this.showNotification('success', result.message || 'Success!');
            
            if (result.redirect) {
                window.location.href = result.redirect;
            }
        } catch (error) {
            this.showNotification('error', error.message || 'An error occurred');
        } finally {
            submitButton.disabled = false;
        }
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

    setupInfiniteScroll() {
        const container = document.querySelector('[data-infinite-scroll]');
        if (!container) return;

        const observer = new IntersectionObserver(
            async (entries) => {
                const entry = entries[0];
                if (entry.isIntersecting) {
                    await this.loadMoreContent(container);
                }
            },
            { threshold: 0.1 }
        );

        const sentinel = document.createElement('div');
        sentinel.className = 'sentinel';
        container.appendChild(sentinel);
        observer.observe(sentinel);
    }

    async loadMoreContent(container) {
        const url = container.getAttribute('data-load-more-url');
        const page = parseInt(container.getAttribute('data-current-page')) || 1;

        try {
            const response = await fetch(`${url}?page=${page + 1}`);
            if (!response.ok) throw new Error('Failed to load more content');

            const data = await response.json();
            if (data.items && data.items.length > 0) {
                container.insertAdjacentHTML('beforeend', data.items);
                container.setAttribute('data-current-page', page + 1);
            }

            if (!data.has_more) {
                container.querySelector('.sentinel').remove();
            }
        } catch (error) {
            console.error('Error loading more content:', error);
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

    showNotification(type, message) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Auto-remove after 3 seconds
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