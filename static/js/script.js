'use strict';

// Security measures
const securityMeasures = {
    sanitizeInput: function(input) {
        return input.replace(/[<>]/g, '');
    },
    validatePhoneNumber: function(phone) {
        return /^(?:\+254|0)\d{9}$/.test(phone);
    },
    validateEmail: function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('logistics-form');
    const submitButton = document.getElementById('submit-btn');

    if (form) {
        // Add input validation on blur
        form.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('blur', function() {
                this.value = securityMeasures.sanitizeInput(this.value);
            });
        });

        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Disable submit button to prevent double submission
            submitButton.disabled = true;
            
            // Get form data
            const formData = new FormData(form);
            const formDataObj = {};
            formData.forEach((value, key) => {
                formDataObj[key] = securityMeasures.sanitizeInput(value);
            });

            // Validate phone number and email
            if (!securityMeasures.validatePhoneNumber(formDataObj.phone)) {
                alert('Please enter a valid phone number');
                submitButton.disabled = false;
                return;
            }

            if (!securityMeasures.validateEmail(formDataObj.email)) {
                alert('Please enter a valid email address');
                submitButton.disabled = false;
                return;
            }

            try {
                // First, submit the form data
                const formResponse = await fetch('/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-CSRFToken': getCookie('csrftoken')
                    },
                    body: new URLSearchParams(formData),
                    credentials: 'same-origin'
                });

                if (!formResponse.ok) {
                    throw new Error('Network response was not ok');
                }

                const formResult = await formResponse.json();

                if (formResult.status === 'success') {
                    // If form submission is successful, initiate M-Pesa payment
                    const paymentData = {
                        phone_number: formDataObj.phone,
                        amount: 1 // You can modify this to get the actual amount
                    };

                    const paymentResponse = await fetch('/initiate-payment/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': getCookie('csrftoken')
                        },
                        body: JSON.stringify(paymentData),
                        credentials: 'same-origin'
                    });

                    if (!paymentResponse.ok) {
                        throw new Error('Payment initiation failed');
                    }

                    const paymentResult = await paymentResponse.json();

                    if (paymentResult.status === 'success') {
                        alert('Please check your phone for the M-Pesa payment prompt');
                        form.reset();
                    } else {
                        alert('Payment initiation failed: ' + paymentResult.message);
                    }
                } else {
                    alert('Form submission failed: ' + formResult.message);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred. Please try again.');
            } finally {
                // Re-enable submit button
                submitButton.disabled = false;
            }
        });
    }

    // Function to get CSRF token from cookies
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
}); 