from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_http_methods
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django_daraja.mpesa.core import MpesaClient
from .models import MpesaPayment
import json
import re
import bleach

def sanitize_input(text):
    """Sanitize input text using bleach"""
    return bleach.clean(text, strip=True)

def validate_phone_number(phone):
    """Validate Kenyan phone number"""
    pattern = r'^(?:\+254|0)\d{9}$'
    return bool(re.match(pattern, phone))

@csrf_protect
@require_http_methods(["GET", "POST"])
def index(request):
    if request.method == 'POST':
        try:
            # Sanitize and validate inputs
            full_name = sanitize_input(request.POST.get('full_name', ''))
            email = sanitize_input(request.POST.get('email', ''))
            phone = sanitize_input(request.POST.get('phone', ''))
            street = sanitize_input(request.POST.get('street', ''))
            apartment = sanitize_input(request.POST.get('apartment', ''))
            floor = sanitize_input(request.POST.get('floor', ''))
            details = sanitize_input(request.POST.get('details', ''))

            # Validate email
            try:
                validate_email(email)
            except ValidationError:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Invalid email address'
                }, status=400)

            # Validate phone number
            if not validate_phone_number(phone):
                return JsonResponse({
                    'status': 'error',
                    'message': 'Invalid phone number'
                }, status=400)

            # Here you would typically save this to a database
            return JsonResponse({
                'status': 'success',
                'message': 'Thank you for your submission!'
            })
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': 'An error occurred while processing your request'
            }, status=500)
    
    return render(request, 'index.html')

@csrf_protect
@require_http_methods(["POST"])
def initiate_payment(request):
    try:
        data = json.loads(request.body)
        phone_number = sanitize_input(data.get('phone_number', ''))
        amount = data.get('amount')

        # Validate phone number
        if not validate_phone_number(phone_number):
            return JsonResponse({
                'status': 'error',
                'message': 'Invalid phone number'
            }, status=400)

        # Validate amount
        try:
            amount = float(amount)
            if amount <= 0:
                raise ValueError
        except (TypeError, ValueError):
            return JsonResponse({
                'status': 'error',
                'message': 'Invalid amount'
            }, status=400)

        # Initialize the MpesaClient
        cl = MpesaClient()
        
        # Prepare the phone number
        if phone_number.startswith('0'):
            phone_number = '254' + phone_number[1:]
        elif phone_number.startswith('+254'):
            phone_number = phone_number[1:]
        
        # Create a new payment record
        payment = MpesaPayment.objects.create(
            phone_number=phone_number,
            amount=amount,
            reference=f"REF-{phone_number[-9:]}",
            description="Payment for logistics services"
        )
        
        # Make the STK push request
        response = cl.stk_push(
            phone_number=phone_number,
            amount=int(amount),
            account_reference=payment.reference,
            transaction_desc=payment.description
        )
        
        if response.get('ResponseCode') == "0":
            payment.transaction_id = response.get('CheckoutRequestID')
            payment.save()
            return JsonResponse({
                'status': 'success',
                'message': 'Payment initiated successfully. Please check your phone.',
                'checkout_request_id': response.get('CheckoutRequestID')
            })
        else:
            payment.status = 'failed'
            payment.result_description = response.get('ResponseDescription')
            payment.save()
            return JsonResponse({
                'status': 'error',
                'message': response.get('ResponseDescription', 'Payment initiation failed.')
            }, status=400)
            
    except json.JSONDecodeError:
        return JsonResponse({
            'status': 'error',
            'message': 'Invalid JSON data'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': 'An error occurred while processing your request'
        }, status=500)

@csrf_protect
@require_http_methods(["POST"])
def payment_callback(request):
    try:
        # Verify callback signature (you should implement this based on M-Pesa documentation)
        
        # Get the callback data
        callback_data = json.loads(request.body)
        
        # Get the payment by CheckoutRequestID
        checkout_request_id = callback_data.get('Body', {}).get('stkCallback', {}).get('CheckoutRequestID')
        result_code = callback_data.get('Body', {}).get('stkCallback', {}).get('ResultCode')
        
        try:
            payment = MpesaPayment.objects.get(transaction_id=checkout_request_id)
            
            if result_code == 0:
                # Payment successful
                payment.status = 'completed'
            else:
                # Payment failed
                payment.status = 'failed'
            
            payment.result_code = result_code
            payment.result_description = callback_data.get('Body', {}).get('stkCallback', {}).get('ResultDesc')
            payment.save()
            
            return JsonResponse({
                'status': 'success',
                'message': 'Callback processed successfully'
            })
            
        except MpesaPayment.DoesNotExist:
            return JsonResponse({
                'status': 'error',
                'message': 'Payment record not found'
            }, status=404)
            
    except json.JSONDecodeError:
        return JsonResponse({
            'status': 'error',
            'message': 'Invalid JSON data'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': 'An error occurred while processing your request'
        }, status=500)
