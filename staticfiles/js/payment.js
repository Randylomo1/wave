class PaymentHandler {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const paymentForm = document.getElementById('payment-form');
        if (paymentForm) {
            paymentForm.addEventListener('submit', this.handlePaymentSubmit.bind(this));
        }

        // Payment method selection
        const methodSelectors = document.querySelectorAll('[name="payment_method"]');
        methodSelectors.forEach(selector => {
            selector.addEventListener('change', this.togglePaymentMethod.bind(this));
        });
    }

    togglePaymentMethod(event) {
        const method = event.target.value;
        document.querySelectorAll('.payment-method').forEach(el => el.style.display = 'none');
        document.getElementById(`${method}-payment`).style.display = 'block';
    }

    async handlePaymentSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const submitButton = form.querySelector('button[type="submit"]');
        const paymentMethod = document.querySelector('[name="payment_method"]:checked').value;

        try {
            submitButton.disabled = true;
            submitButton.textContent = 'Processing...';

            const response = await this.submitPayment(paymentMethod, form);
            
            if (response.ok) {
                const result = await response.json();
                this.handlePaymentSuccess(paymentMethod, result.transaction_id);
            } else {
                throw new Error('Payment failed');
            }
        } catch (error) {
            this.handlePaymentError(error);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Pay Now';
        }
    }

    async submitPayment(method, form) {
        const formData = new FormData(form);
        return fetch('/api/payments/initiate/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCsrfToken(),
            },
            body: JSON.stringify({
                payment_method: method,
                amount: formData.get('amount'),
                phone_number: formData.get('phone_number'),
            }),
        });
    }

    handlePaymentSuccess(method, transactionId) {
        const successMessage = document.getElementById('payment-success');
        successMessage.textContent = `Payment successful! Transaction ID: ${transactionId}`;
        successMessage.style.display = 'block';
        
        setTimeout(() => {
            window.location.href = `/payment/success/?method=${method}&transaction_id=${transactionId}`;
        }, 2000);
    }

    handlePaymentError(error) {
        const errorElement = document.getElementById('payment-errors');
        errorElement.textContent = error.message || 'An error occurred during payment';
        errorElement.style.display = 'block';
    }

    getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]').value;
    }
}

// Initialize payment handler when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PaymentHandler();
}); 