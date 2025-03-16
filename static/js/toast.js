class ToastManager {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        document.body.appendChild(this.container);
    }

    show(title, message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');

        const icon = this.getIcon(type);
        
        toast.innerHTML = `
            <div class="toast-header">
                ${icon}
                <strong>${title}</strong>
                <button type="button" class="toast-close" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="toast-body">${message}</div>
        `;

        // Add to container
        this.container.appendChild(toast);

        // Add show class after a small delay for animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Setup close button
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.hide(toast));

        // Auto dismiss
        if (duration > 0) {
            setTimeout(() => this.hide(toast), duration);
        }

        // Accessibility: Remove toast from DOM after animation
        toast.addEventListener('animationend', () => {
            if (!toast.classList.contains('show')) {
                toast.remove();
            }
        });

        return toast;
    }

    hide(toast) {
        toast.classList.remove('show');
        toast.classList.add('hiding');
    }

    getIcon(type) {
        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-exclamation-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };
        return icons[type] || icons.info;
    }
}

// Initialize toast manager and expose to window
window.toastManager = new ToastManager();

// Global function to show toasts
window.showToast = (title, message, type = 'info', duration = 5000) => {
    window.toastManager.show(title, message, type, duration);
}; 