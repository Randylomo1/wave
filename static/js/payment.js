class PaymentHandler {
    constructor() {
        this.form = document.getElementById('payment-form');
        this.submitButton = document.getElementById('submit-payment');
        this.methodButtons = document.querySelectorAll('.method-btn');
        this.paymentSections = document.querySelectorAll('.payment-section');
        this.successMessage = document.querySelector('.success-message');
        this.errorMessage = document.querySelector('.error-message');
        this.loadingOverlay = document.querySelector('.loading-overlay');
        this.currentMethod = 'card';
        
        // Card validation patterns
        this.patterns = {
            cardNumber: /^[0-9]{16}$/,
            expiry: /^(0[1-9]|1[0-2])\/([0-9]{2})$/,
            cvv: /^[0-9]{3,4}$/,
            phone: /^[0-9]{10,12}$/,
            email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        };

        // Card types patterns
        this.cardTypes = {
            visa: /^4/,
            mastercard: /^5[1-5]/,
            amex: /^3[47]/,
            discover: /^6/
        };
    }

    init() {
        this.setupEventListeners();
        this.initializePayPal();
        this.setupInputFormatting();
    }

    setupEventListeners() {
        // Payment method selection
        this.methodButtons.forEach(button => {
            button.addEventListener('click', () => this.togglePaymentMethod(button));
        });

        // Form submission
        this.form.addEventListener('submit', (e) => this.handlePaymentSubmit(e));

        // Real-time validation
        this.form.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', () => this.validateField(input));
            input.addEventListener('blur', () => this.validateField(input));
        });
    }

    setupInputFormatting() {
        // Card number formatting
        const cardInput = document.getElementById('card-number');
        if (cardInput) {
            cardInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                value = value.replace(/(.{4})/g, '$1 ').trim();
                e.target.value = value;

                // Update card type logo
                const cardType = this.detectCardType(value);
                this.updateCardLogo(cardType);
            });
        }

        // Expiry date formatting
        const expiryInput = document.getElementById('expiry');
        if (expiryInput) {
            expiryInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 2) {
                    value = value.slice(0, 2) + '/' + value.slice(2);
                }
                e.target.value = value;
            });
        }

        // CVV formatting
        const cvvInput = document.getElementById('cvv');
        if (cvvInput) {
            cvvInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
            });
        }

        // Phone number formatting
        const phoneInput = document.getElementById('phone-number');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '');
            });
        }
    }

    validateField(field) {
        const pattern = this.patterns[field.id.replace('-', '')];
        let isValid = true;
        let errorMessage = '';

        // Check required fields
        if (field.required && !field.value.trim()) {
            isValid = false;
            errorMessage = 'This field is required';
        }
        // Check pattern matching
        else if (pattern && !pattern.test(field.value.replace(/\s/g, ''))) {
            isValid = false;
            errorMessage = this.getErrorMessage(field.id);
        }
        // Additional validation for expiry date
        else if (field.id === 'expiry' && !this.isValidExpiryDate(field.value)) {
            isValid = false;
            errorMessage = 'Invalid expiry date';
        }

        // Update field styling
        field.classList.toggle('is-invalid', !isValid);
        field.classList.toggle('is-valid', isValid);

        // Update error message
        const feedback = field.nextElementSibling;
        if (feedback && feedback.classList.contains('invalid-feedback')) {
            feedback.textContent = errorMessage;
        } else if (!isValid) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'invalid-feedback';
            errorDiv.textContent = errorMessage;
            field.parentNode.insertBefore(errorDiv, field.nextSibling);
        }

        return isValid;
    }

    getErrorMessage(fieldId) {
        const messages = {
            'card-number': 'Please enter a valid 16-digit card number',
            'expiry': 'Please enter a valid expiry date (MM/YY)',
            'cvv': 'Please enter a valid CVV (3-4 digits)',
            'phone-number': 'Please enter a valid phone number',
            'email': 'Please enter a valid email address'
        };
        return messages[fieldId] || 'Invalid input';
    }

    isValidExpiryDate(value) {
        const [month, year] = value.split('/').map(num => parseInt(num, 10));
        if (!month || !year) return false;

        const now = new Date();
        const expiry = new Date(2000 + year, month - 1);
        return expiry > now;
    }

    togglePaymentMethod(button) {
        const method = button.dataset.method;
        
        // Update buttons
        this.methodButtons.forEach(btn => {
            btn.classList.toggle('active', btn === button);
        });

        // Update sections
        this.paymentSections.forEach(section => {
            section.classList.toggle('active', section.id === `${method}-payment`);
        });

        this.currentMethod = method;
        this.updateFormValidation();
    }

    updateFormValidation() {
        // Reset all fields
        this.form.querySelectorAll('input').forEach(input => {
            input.required = false;
        });

        // Set required fields based on payment method
        switch (this.currentMethod) {
            case 'card':
                ['card-number', 'expiry', 'cvv', 'email'].forEach(id => {
                    const input = document.getElementById(id);
                    if (input) input.required = true;
                });
                break;
            case 'mpesa':
                ['phone-number', 'email'].forEach(id => {
                    const input = document.getElementById(id);
                    if (input) input.required = true;
                });
                break;
            case 'paypal':
                const emailInput = document.getElementById('email');
                if (emailInput) emailInput.required = true;
                break;
        }
    }

    showLoading(message = 'Processing your payment...') {
        this.loadingOverlay.querySelector('.loading-text').textContent = message;
        this.loadingOverlay.classList.add('active');
        this.submitButton.disabled = true;
    }

    hideLoading() {
        this.loadingOverlay.classList.remove('active');
        this.submitButton.disabled = false;
    }

    detectCardType(number) {
        const cleanNumber = number.replace(/\D/g, '');
        for (const [type, pattern] of Object.entries(this.cardTypes)) {
            if (pattern.test(cleanNumber)) {
                return type;
            }
        }
        return 'unknown';
    }

    updateCardLogo(type) {
        const cardLogo = document.querySelector('.card-logo i');
        cardLogo.className = `fab fa-cc-${type}`;
    }

    async handlePaymentSubmit(e) {
        e.preventDefault();

        // Validate all visible required fields
        let isValid = true;
        this.form.querySelectorAll('input:required:not([type="hidden"])').forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        if (!isValid) {
            window.showToast('Validation Error', 'Please fill in all required fields correctly', 'error');
            return;
        }

        this.showLoading();

        try {
            // Check for online status
            if (!navigator.onLine) {
                if (this.currentMethod === 'card') {
                    throw new Error('Cannot process card payments while offline');
                }
                // Store form data for background sync
                await this.storeFormData();
                window.showToast('Payment Queued', 'Payment will be processed when you\'re back online', 'info');
                return;
            }

            const formData = new FormData(this.form);
            formData.append('payment_method', this.currentMethod);

            const response = await this.submitPayment(formData);
            
            if (response.success) {
                this.handlePaymentSuccess(response);
            } else {
                throw new Error(response.message || 'Payment failed');
            }
        } catch (error) {
            this.handlePaymentError(error);
        } finally {
            this.hideLoading();
        }
    }

    async submitPayment(formData) {
        const response = await fetch(this.form.action, {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': window.utils.getCsrfToken()
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    async storeFormData() {
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            const registration = await navigator.serviceWorker.ready;
            const formData = new FormData(this.form);
            const data = {
                method: this.currentMethod,
                timestamp: Date.now(),
                data: Object.fromEntries(formData.entries())
            };

            // Store form data in IndexedDB
            const db = await this.openDatabase();
            const tx = db.transaction('forms', 'readwrite');
            await tx.objectStore('forms').add(data);

            // Register for background sync
            await registration.sync.register('sync-forms');
        } else {
            throw new Error('Background sync is not supported');
        }
    }

    async openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('WaveLogistics', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('forms')) {
                    db.createObjectStore('forms', { keyPath: 'timestamp' });
                }
            };
        });
    }

    handlePaymentSuccess(response) {
        window.showToast('Success', 'Payment processed successfully!', 'success');
        
        // Store transaction details
        if (response.transactionId) {
            localStorage.setItem('lastTransactionId', response.transactionId);
            localStorage.setItem('lastTransactionAmount', response.amount);
            localStorage.setItem('lastTransactionDate', new Date().toISOString());
        }

        // Send success notification if supported
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification('Payment Successful', {
                body: `Your payment of ${response.amount} has been processed successfully.`,
                icon: '/static/main/img/logo-192.png',
                badge: '/static/main/img/badge.png'
            });
        }

        // Redirect to receipt page after delay
        setTimeout(() => {
            window.location.href = response.redirectUrl || '/payment/success/';
        }, 2000);
    }

    handlePaymentError(error) {
        let errorMessage = 'Payment failed. Please try again.';
        let errorType = 'error';

        // Handle specific error cases
        if (!navigator.onLine) {
            errorMessage = 'You are currently offline. Please check your internet connection.';
            errorType = 'warning';
        } else if (error.name === 'TypeError') {
            errorMessage = 'There was a problem connecting to the payment server.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        window.showToast('Payment Failed', errorMessage, errorType);

        // Track error for analytics
        if (window.gtag) {
            gtag('event', 'payment_error', {
                error_type: error.name,
                error_message: error.message
            });
        }
    }

    initializePayPal() {
        if (window.paypalClientId) {
            paypal.Buttons({
                createOrder: (data, actions) => {
                    return actions.order.create({
                        purchase_units: [{
                            amount: {
                                value: document.querySelector('.amount').textContent.replace(/[^0-9.]/g, '')
                            }
                        }]
                    });
                },
                onApprove: async (data, actions) => {
                    try {
                        const details = await actions.order.capture();
                        const formData = new FormData(this.form);
                        formData.append('paypal_order_id', details.id);
                        const response = await this.submitPayment(formData);
                        this.handlePaymentSuccess(response);
                    } catch (error) {
                        this.handlePaymentError(error);
                    }
                },
                onError: (error) => {
                    this.handlePaymentError(error);
                }
            }).render('#paypal-button-container');
        }
    }
}

// Initialize payment handler when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PaymentHandler();
});

// Payment method selection
document.addEventListener('DOMContentLoaded', function() {
    const methodButtons = document.querySelectorAll('.method-btn');
    const paymentSections = document.querySelectorAll('.payment-section');
    
    methodButtons.forEach(button => {
        button.addEventListener('click', function() {
            const method = this.dataset.method;
            
            // Update button states
            methodButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Show relevant payment section
            paymentSections.forEach(section => {
                if (section.id === `${method}-payment`) {
                    section.classList.add('active');
                } else {
                    section.classList.remove('active');
                }
            });
        });
    });
});

// Card number formatting
function formatCardNumber(input) {
    let value = input.value.replace(/\D/g, '');
    value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    input.value = value;
}

// Card expiry formatting
function formatExpiry(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length >= 2) {
        value = value.slice(0, 2) + '/' + value.slice(2, 4);
    }
    input.value = value;
}

// Card preview update
function updateCardPreview() {
    const number = document.getElementById('card-number').value || '•••• •••• •••• ••••';
    const name = document.getElementById('card-name').value || 'CARD HOLDER';
    const expiry = document.getElementById('card-expiry').value || 'MM/YY';
    
    document.querySelector('.card-number-preview').textContent = number;
    document.querySelector('.card-name-preview').textContent = name.toUpperCase();
    document.querySelector('.card-expiry-preview').textContent = expiry;
}

// Payment form submission
document.addEventListener('DOMContentLoaded', function() {
    const paymentForm = document.getElementById('payment-form');
    
    if (paymentForm) {
        paymentForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const selectedMethod = document.querySelector('.method-btn.active')?.dataset.method;
            if (!selectedMethod) {
                utils.showToast('Error', 'Please select a payment method', 'error');
                return;
            }
            
            loadingOverlay.show('Processing payment...');
            
            try {
                // Simulate payment processing
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const response = await fetch('/process-payment/', {
                    method: 'POST',
                    body: new FormData(paymentForm),
                    headers: {
                        'X-CSRFToken': utils.getCsrfToken()
                    }
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    utils.showToast('Success', 'Payment processed successfully', 'success');
                    setTimeout(() => {
                        window.location.href = data.redirect_url;
                    }, 1500);
                } else {
                    throw new Error(data.error || 'Payment failed');
                }
            } catch (error) {
                utils.showToast('Error', error.message || 'Payment processing failed', 'error');
            } finally {
                loadingOverlay.hide();
            }
        });
    }
    
    // Card input listeners
    const cardInputs = document.querySelectorAll('.card-input');
    cardInputs.forEach(input => {
        input.addEventListener('input', updateCardPreview);
    });
});

// M-Pesa phone number validation
function validateMpesaNumber(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.startsWith('254')) {
        value = value.slice(3);
    } else if (value.startsWith('0')) {
        value = value.slice(1);
    }
    value = '254' + value;
    input.value = value;
    return /^254\d{9}$/.test(value);
} 