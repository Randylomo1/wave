// Payment Gateway Handlers
class PaymentHandler {
    constructor() {
        this.stripe = null;
        this.paypal = null;
        this.init();
    }

    async init() {
        // Initialize payment gateways
        await this.initStripe();
        await this.initPayPal();
        this.initMpesa();
        this.setupEventListeners();
    }

    async initStripe() {
        try {
            this.stripe = Stripe(window.stripePublicKey);
            const elements = this.stripe.elements();
            const card = elements.create('card', {
                style: {
                    base: {
                        fontSize: '16px',
                        color: '#32325d',
                    },
                },
            });
            card.mount('#card-element');
            this.handleStripeErrors(card);
        } catch (error) {
            console.error('Stripe initialization failed:', error);
        }
    }

    async initPayPal() {
        try {
            await paypal.Buttons({
                createOrder: (data, actions) => {
                    return actions.order.create({
                        purchase_units: [{
                            amount: {
                                value: document.getElementById('amount').value
                            }
                        }]
                    });
                },
                onApprove: async (data, actions) => {
                    const order = await actions.order.capture();
                    this.handlePaymentSuccess('paypal', order.id);
                }
            }).render('#paypal-button-container');
        } catch (error) {
            console.error('PayPal initialization failed:', error);
        }
    }

    initMpesa() {
        const mpesaForm = document.getElementById('mpesa-form');
        if (mpesaForm) {
            mpesaForm.addEventListener('submit', this.handleMpesaSubmit.bind(this));
        }
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

            switch (paymentMethod) {
                case 'card':
                    await this.processCardPayment(form);
                    break;
                case 'mpesa':
                    await this.processMpesaPayment(form);
                    break;
                // PayPal is handled by its own SDK
            }
        } catch (error) {
            this.handlePaymentError(error);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Pay Now';
        }
    }

    async processCardPayment(form) {
        try {
            const { token, error } = await this.stripe.createToken('#card-element');
            if (error) {
                throw error;
            }

            const response = await this.submitPayment('card', {
                token: token.id,
                amount: form.querySelector('#amount').value
            });

            if (response.ok) {
                const result = await response.json();
                this.handlePaymentSuccess('card', result.charge_id);
            } else {
                throw new Error('Payment failed');
            }
        } catch (error) {
            this.handlePaymentError(error);
        }
    }

    async processMpesaPayment(form) {
        try {
            const phoneNumber = form.querySelector('#phone_number').value;
            const amount = form.querySelector('#amount').value;

            const response = await this.submitPayment('mpesa', {
                phone_number: phoneNumber,
                amount: amount
            });

            if (response.ok) {
                const result = await response.json();
                this.startMpesaStatusCheck(result.reference);
            } else {
                throw new Error('M-Pesa payment initiation failed');
            }
        } catch (error) {
            this.handlePaymentError(error);
        }
    }

    async submitPayment(method, data) {
        const response = await fetch('/api/payments/initiate/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCsrfToken(),
            },
            body: JSON.stringify({
                payment_method: method,
                ...data
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Payment failed');
        }

        return response;
    }

    startMpesaStatusCheck(reference) {
        const statusCheck = async () => {
            try {
                const response = await fetch(`/api/payments/status/${reference}/`);
                const result = await response.json();

                if (result.status === 'completed') {
                    this.handlePaymentSuccess('mpesa', result.mpesa_receipt);
                    return;
                } else if (result.status === 'failed') {
                    this.handlePaymentError(new Error(result.result_description));
                    return;
                }

                // Continue checking status
                setTimeout(statusCheck, 5000);
            } catch (error) {
                this.handlePaymentError(error);
            }
        };

        // Start checking status
        setTimeout(statusCheck, 5000);
    }

    handleStripeErrors(card) {
        card.addEventListener('change', (event) => {
            const displayError = document.getElementById('card-errors');
            if (event.error) {
                displayError.textContent = event.error.message;
            } else {
                displayError.textContent = '';
            }
        });
    }

    handlePaymentSuccess(method, transactionId) {
        // Show success message
        const successMessage = document.getElementById('payment-success');
        successMessage.textContent = `Payment successful! Transaction ID: ${transactionId}`;
        successMessage.style.display = 'block';

        // Hide payment form
        document.getElementById('payment-form').style.display = 'none';

        // Redirect to success page after delay
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