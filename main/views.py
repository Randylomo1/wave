from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_protect, csrf_exempt
from django.views.decorators.http import require_http_methods
from django.core.validators import validate_email, URLValidator
from django.core.exceptions import ValidationError
from django.utils.html import escape
from django.conf import settings
from django.core.cache import cache
from django.utils.crypto import get_random_string
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import UserRateThrottle, ScopedRateThrottle
from rest_framework.response import Response
from rest_framework import status
from .mpesa.mpesa import MpesaClient
from .models import MpesaPayment, PaymentTransaction, Order, Product, Category, Cart, CartItem, Wishlist
import json
import re
import paypalrestsdk
import stripe
import hmac
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from django.contrib.auth.decorators import login_required
from django.template.loader import get_template
from django.utils import timezone
import qrcode
import barcode
from barcode.writer import ImageWriter
import io
from PIL import Image
from django.contrib import messages
from django.db.models import Q
from decimal import Decimal

# Configure logging
logger = logging.getLogger(__name__)

# Configure payment gateways
paypalrestsdk.configure({
    "mode": settings.PAYPAL_MODE,
    "client_id": settings.PAYPAL_CLIENT_ID,
    "client_secret": settings.PAYPAL_CLIENT_SECRET
})

stripe.api_key = settings.STRIPE_SECRET_KEY

class PaymentRateThrottle(ScopedRateThrottle):
    scope = 'payment'

def generate_transaction_reference() -> str:
    """Generate a unique transaction reference"""
    return f"TXN-{get_random_string(32)}"

def verify_webhook_signature(request, secret: str) -> bool:
    """Verify webhook signature for payment callbacks"""
    try:
        signature = request.headers.get('X-Webhook-Signature')
        if not signature:
            return False
            
        # Calculate expected signature
        payload = request.body
        expected_sig = hmac.new(
            secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected_sig)
    except Exception as e:
        logger.error(f"Webhook signature verification failed: {str(e)}")
        return False

def sanitize_input(text: Optional[str]) -> str:
    """Sanitize input text using Django's escape function"""
    if not text:
        return ''
    return escape(text.strip())

def validate_phone_number(phone: str) -> bool:
    """Validate Kenyan phone number"""
    pattern = r'^(?:\+254|0)\d{9}$'
    return bool(re.match(pattern, phone))

def validate_amount(amount: str) -> bool:
    """Validate payment amount"""
    try:
        amount = float(amount)
        return 0 < amount <= 1000000  # Maximum amount of 1M
    except (ValueError, TypeError):
        return False

@csrf_protect
@require_http_methods(["GET", "POST"])
def index(request):
    if request.method == 'POST':
        try:
            # Get and sanitize inputs
            data = {
                'full_name': sanitize_input(request.POST.get('full_name')),
                'email': sanitize_input(request.POST.get('email')),
                'phone': sanitize_input(request.POST.get('phone')),
                'street': sanitize_input(request.POST.get('street')),
                'apartment': sanitize_input(request.POST.get('apartment')),
                'floor': sanitize_input(request.POST.get('floor')),
                'details': sanitize_input(request.POST.get('details'))
            }
            
            # Validate required fields
            if not all([data['full_name'], data['email'], data['phone']]):
                return JsonResponse({
                    'status': 'error',
                    'message': 'Required fields missing'
                }, status=400)

            # Validate email
            try:
                validate_email(data['email'])
            except ValidationError:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Invalid email address'
                }, status=400)

            # Validate phone number
            if not validate_phone_number(data['phone']):
                return JsonResponse({
                    'status': 'error',
                    'message': 'Invalid phone number'
                }, status=400)

            # Store form data in session with expiry
            request.session['delivery_details'] = data
            request.session.set_expiry(3600)  # 1 hour expiry

            return JsonResponse({
                'status': 'success',
                'message': 'Thank you for your submission!'
            })
        except Exception as e:
            logger.error(f"Error processing form submission: {str(e)}")
            return JsonResponse({
                'status': 'error',
                'message': 'An error occurred while processing your request'
            }, status=500)
    
    return render(request, 'index.html')

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([PaymentRateThrottle])
def initiate_payment(request):
    """Initiate payment based on selected payment method"""
    try:
        # Validate request body
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({
                'error': 'Invalid JSON payload'
            }, status=400)

        # Get and validate payment method
        payment_method = data.get('payment_method', '').lower()
        if not payment_method or payment_method not in settings.ALLOWED_PAYMENT_METHODS:
            return JsonResponse({
                'error': 'Invalid payment method'
            }, status=400)

        # Validate amount
        amount = data.get('amount')
        if not validate_amount(amount):
            return JsonResponse({
                'error': 'Invalid amount'
            }, status=400)

        # Rate limit check using cache
        cache_key = f"payment_attempt_{request.user.id}"
        attempts = cache.get(cache_key, 0)
        if attempts >= 10:  # Max 10 attempts per minute
            return JsonResponse({
                'error': 'Too many payment attempts. Please try again later.'
            }, status=429)
        cache.set(cache_key, attempts + 1, 60)  # 1 minute expiry

        # Generate unique reference
        reference = generate_transaction_reference()

        # Create initial transaction record
        transaction = PaymentTransaction.objects.create(
            payment_method=payment_method,
            amount=amount,
            status='pending',
            reference=reference,
            customer_phone=data.get('phone_number'),
            customer_email=request.user.email
        )

        # Process payment based on method
        if payment_method == 'mpesa':
            return initiate_mpesa_payment(request, transaction)
        elif payment_method == 'paypal':
            return initiate_paypal_payment(request, transaction)
        elif payment_method == 'card':
            return initiate_card_payment(request, transaction)

    except Exception as e:
        logger.error(f"Payment initiation error: {str(e)}")
        return JsonResponse({
            'error': 'An error occurred while processing your payment'
        }, status=500)

def initiate_mpesa_payment(request, transaction: PaymentTransaction):
    """Initiate M-Pesa payment"""
    try:
        data = json.loads(request.body)
        phone_number = data.get('phone_number')
        
        # Validate phone number
        if not validate_phone_number(phone_number):
            transaction.status = 'failed'
            transaction.save()
            return JsonResponse({
                'error': 'Invalid phone number'
            }, status=400)
            
        # Initialize M-Pesa client
        mpesa = MpesaClient()
        
        # Prepare callback URL with signature
        callback_url = request.build_absolute_uri('/mpesa/callback/')
        
        # Initiate STK push
        response = mpesa.stk_push(
            phone_number=phone_number,
            amount=transaction.amount,
            callback_url=callback_url,
            account_reference=transaction.reference,
            transaction_desc="Payment for logistics services"
        )
        
        if response.get('ResponseCode') == '0':
            # Create M-Pesa payment record
            MpesaPayment.objects.create(
                phone_number=phone_number,
                amount=transaction.amount,
                reference=transaction.reference,
                description="Payment for logistics services",
                status='Pending'
            )
            
            return JsonResponse({
                'status': 'success',
                'reference': transaction.reference,
                'checkout_request_id': response.get('CheckoutRequestID')
            })
        else:
            transaction.status = 'failed'
            transaction.save()
            return JsonResponse({
                'error': response.get('ResponseDescription', 'Payment initiation failed')
            }, status=400)
            
    except Exception as e:
        logger.error(f"M-Pesa payment error: {str(e)}")
        transaction.status = 'failed'
        transaction.save()
        return JsonResponse({
            'error': str(e)
        }, status=500)

def initiate_paypal_payment(request, transaction: PaymentTransaction):
    """Initiate PayPal payment"""
    try:
        # Create PayPal payment
        payment = paypalrestsdk.Payment({
            "intent": "sale",
            "payer": {
                "payment_method": "paypal"
            },
            "redirect_urls": {
                "return_url": request.build_absolute_uri(f'/paypal/success/{transaction.reference}/'),
                "cancel_url": request.build_absolute_uri(f'/paypal/cancel/{transaction.reference}/')
            },
            "transactions": [{
                "amount": {
                    "total": str(transaction.amount),
                    "currency": "USD"
                },
                "description": "Wave Logistics Services",
                "custom": transaction.reference
            }]
        })

        if payment.create():
            # Extract approval URL
            approval_url = next(link.href for link in payment.links if link.rel == "approval_url")
            
            return JsonResponse({
                'status': 'success',
                'reference': transaction.reference,
                'approval_url': approval_url
            })
        else:
            transaction.status = 'failed'
            transaction.save()
            return JsonResponse({
                'error': payment.error
            }, status=400)
            
    except Exception as e:
        logger.error(f"PayPal payment error: {str(e)}")
        transaction.status = 'failed'
        transaction.save()
        return JsonResponse({
            'error': str(e)
        }, status=500)

def initiate_card_payment(request, transaction: PaymentTransaction):
    """Initiate card payment using Stripe"""
    try:
        data = json.loads(request.body)
        token = data.get('token')
        
        if not token:
            transaction.status = 'failed'
            transaction.save()
            return JsonResponse({
                'error': 'Card token is required'
            }, status=400)
            
        # Create Stripe charge
        charge = stripe.Charge.create(
            amount=int(transaction.amount * 100),  # Convert to cents
            currency='usd',
            source=token,
            description='Wave Logistics Services',
            metadata={
                'reference': transaction.reference
            }
        )
        
        if charge.paid:
            transaction.status = 'completed'
            transaction.transaction_id = charge.id
            transaction.save()
            
            return JsonResponse({
                'status': 'success',
                'reference': transaction.reference,
                'charge_id': charge.id
            })
        else:
            transaction.status = 'failed'
            transaction.save()
            return JsonResponse({
                'error': 'Payment failed'
            }, status=400)
            
    except stripe.error.CardError as e:
        logger.error(f"Stripe card error: {str(e)}")
        transaction.status = 'failed'
        transaction.save()
        return JsonResponse({
            'error': str(e.error.message)
        }, status=400)
    except Exception as e:
        logger.error(f"Stripe payment error: {str(e)}")
        transaction.status = 'failed'
        transaction.save()
        return JsonResponse({
            'error': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def mpesa_callback(request):
    """Handle M-Pesa callback"""
    try:
        # Verify callback signature
        if not verify_webhook_signature(request, settings.MPESA_PASSKEY):
            logger.error("Invalid M-Pesa callback signature")
            return JsonResponse({
                'error': 'Invalid signature'
            }, status=400)

        data = json.loads(request.body)
        
        # Extract callback data
        callback_data = data.get('Body', {}).get('stkCallback', {})
        result_code = callback_data.get('ResultCode')
        result_desc = callback_data.get('ResultDesc')
        checkout_request_id = callback_data.get('CheckoutRequestID')
        
        # Get related transactions
        try:
            mpesa_payment = MpesaPayment.objects.get(reference=checkout_request_id)
            transaction = PaymentTransaction.objects.get(reference=mpesa_payment.reference)
        except (MpesaPayment.DoesNotExist, PaymentTransaction.DoesNotExist):
            logger.error(f"Transaction not found for checkout request: {checkout_request_id}")
            return JsonResponse({
                'error': 'Transaction not found'
            }, status=404)
        
        if result_code == 0:
            # Payment successful
            callback_metadata = callback_data.get('CallbackMetadata', {}).get('Item', [])
            amount = next((item['Value'] for item in callback_metadata if item['Name'] == 'Amount'), None)
            mpesa_receipt_number = next((item['Value'] for item in callback_metadata if item['Name'] == 'MpesaReceiptNumber'), None)
            transaction_date = next((item['Value'] for item in callback_metadata if item['Name'] == 'TransactionDate'), None)
            phone_number = next((item['Value'] for item in callback_metadata if item['Name'] == 'PhoneNumber'), None)
            
            # Update transaction records
            mpesa_payment.status = 'Completed'
            mpesa_payment.transaction_id = mpesa_receipt_number
            mpesa_payment.transaction_date = transaction_date
            mpesa_payment.result_code = str(result_code)
            mpesa_payment.result_description = result_desc
            mpesa_payment.save()
            
            transaction.status = 'completed'
            transaction.transaction_id = mpesa_receipt_number
            transaction.save()
            
        else:
            # Payment failed
            mpesa_payment.status = 'Failed'
            mpesa_payment.result_code = str(result_code)
            mpesa_payment.result_description = result_desc
            mpesa_payment.save()
            
            transaction.status = 'failed'
            transaction.save()
            
        return JsonResponse({
            'result_desc': result_desc,
            'result_code': result_code
        })
        
    except Exception as e:
        logger.error(f"M-Pesa callback error: {str(e)}")
        return JsonResponse({
            'error': str(e)
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@throttle_classes([PaymentRateThrottle])
def check_payment_status(request, reference: str):
    """Check payment status"""
    try:
        # Get transaction
        try:
            transaction = PaymentTransaction.objects.get(reference=reference)
        except PaymentTransaction.DoesNotExist:
            return JsonResponse({
                'error': 'Transaction not found'
            }, status=404)
            
        # Check if transaction belongs to user
        if transaction.customer_email != request.user.email:
            return JsonResponse({
                'error': 'Unauthorized'
            }, status=403)
        
        response = {
            'status': transaction.status,
            'payment_method': transaction.payment_method,
            'amount': str(transaction.amount),
            'transaction_date': transaction.transaction_date.isoformat() if transaction.transaction_date else None
        }
        
        if transaction.payment_method == 'mpesa':
            try:
                mpesa_payment = MpesaPayment.objects.get(reference=reference)
                response.update({
                    'mpesa_receipt': mpesa_payment.transaction_id,
                    'result_description': mpesa_payment.result_description
                })
            except MpesaPayment.DoesNotExist:
                pass
                
        return JsonResponse(response)
        
    except Exception as e:
        logger.error(f"Payment status check error: {str(e)}")
        return JsonResponse({
            'error': str(e)
        }, status=500)

@login_required
def order_receipt(request, reference_number):
    order = get_object_or_404(Order, reference_number=reference_number)
    
    # Check if user has permission to view this receipt
    if order.user != request.user and not request.user.is_staff:
        return HttpResponse('Unauthorized', status=401)

    # Generate QR code for tracking
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    tracking_url = request.build_absolute_uri(order.get_tracking_url())
    qr.add_data(tracking_url)
    qr.make(fit=True)
    qr_image = qr.make_image(fill_color="black", back_color="white")
    
    # Save QR code
    qr_path = f'static/main/img/qr/qr_{order.reference_number}.png'
    qr_image.save(qr_path)

    # Generate barcode
    code128 = barcode.get_barcode_class('code128')
    barcode_path = f'static/main/img/barcode/barcode_{order.reference_number}'
    code128(order.reference_number, writer=ImageWriter()).save(barcode_path)

    context = {
        'order': order,
        'qr_code': f'qr/qr_{order.reference_number}.png',
        'barcode': f'barcode/barcode_{order.reference_number}.png',
        'current_time': timezone.now(),
    }
    
    return render(request, 'main/receipt.html', context)

@login_required
def download_receipt_pdf(request, reference_number):
    order = get_object_or_404(Order, reference_number=reference_number)
    
    # Check if user has permission to download this receipt
    if order.user != request.user and not request.user.is_staff:
        return HttpResponse('Unauthorized', status=401)

    # Get the template
    template = get_template('main/receipt_pdf.html')
    context = {'order': order}
    html = template.render(context)

    # Create PDF
    from weasyprint import HTML
    pdf = HTML(string=html, base_url=request.build_absolute_uri()).write_pdf()

    # Generate response
    response = HttpResponse(pdf, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="receipt_{order.reference_number}.pdf"'
    
    return response

@login_required
def track_order(request, tracking_number):
    order = get_object_or_404(Order, tracking_number=tracking_number)
    
    # Check if user has permission to track this order
    if order.user != request.user and not request.user.is_staff:
        return HttpResponse('Unauthorized', status=401)

    context = {
        'order': order,
        'status_history': order.status_history,
        'current_time': timezone.now(),
    }
    
    return render(request, 'main/track_order.html', context)

def product_list(request):
    categories = Category.objects.all()
    category_slug = request.GET.get('category')
    search_query = request.GET.get('q')
    sort_by = request.GET.get('sort', '-created_at')
    
    products = Product.objects.filter(is_available=True)
    
    if category_slug:
        category = get_object_or_404(Category, slug=category_slug)
        products = products.filter(category=category)
    
    if search_query:
        products = products.filter(
            Q(name__icontains=search_query) |
            Q(description__icontains=search_query)
        )
    
    if sort_by == 'price_low':
        products = products.order_by('price')
    elif sort_by == 'price_high':
        products = products.order_by('-price')
    elif sort_by == 'name':
        products = products.order_by('name')
    else:
        products = products.order_by('-created_at')

    context = {
        'categories': categories,
        'products': products,
        'current_category': category_slug,
        'search_query': search_query,
        'sort_by': sort_by
    }
    return render(request, 'main/product_list.html', context)

def product_detail(request, slug):
    product = get_object_or_404(Product, slug=slug, is_available=True)
    related_products = Product.objects.filter(
        category=product.category,
        is_available=True
    ).exclude(id=product.id)[:4]
    
    context = {
        'product': product,
        'related_products': related_products
    }
    return render(request, 'main/product_detail.html', context)

@login_required
def cart_summary(request):
    cart, created = Cart.objects.get_or_create(user=request.user)
    return render(request, 'main/cart.html', {'cart': cart})

@login_required
def add_to_cart(request, product_id):
    if request.method == 'POST':
        product = get_object_or_404(Product, id=product_id, is_available=True)
        cart, created = Cart.objects.get_or_create(user=request.user)
        quantity = int(request.POST.get('quantity', 1))
        
        if quantity <= 0:
            return JsonResponse({
                'error': 'Invalid quantity'
            }, status=400)
        
        if quantity > product.stock:
            return JsonResponse({
                'error': 'Not enough stock available'
            }, status=400)
        
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={'quantity': quantity}
        )
        
        if not created:
            cart_item.quantity += quantity
            if cart_item.quantity > product.stock:
                return JsonResponse({
                    'error': 'Not enough stock available'
                }, status=400)
            cart_item.save()
        
        return JsonResponse({
            'message': 'Product added to cart',
            'cart_total': cart.total_items
        })
    
    return JsonResponse({'error': 'Invalid request'}, status=400)

@login_required
def update_cart(request, item_id):
    if request.method == 'POST':
        cart_item = get_object_or_404(CartItem, id=item_id, cart__user=request.user)
        quantity = int(request.POST.get('quantity', 0))
        
        if quantity <= 0:
            cart_item.delete()
            message = 'Item removed from cart'
        else:
            if quantity > cart_item.product.stock:
                return JsonResponse({
                    'error': 'Not enough stock available'
                }, status=400)
            
            cart_item.quantity = quantity
            cart_item.save()
            message = 'Cart updated'
        
        cart = cart_item.cart
        return JsonResponse({
            'message': message,
            'cart_total': cart.total_items,
            'cart_subtotal': float(cart.total_price)
        })
    
    return JsonResponse({'error': 'Invalid request'}, status=400)

@login_required
def remove_from_cart(request, item_id):
    if request.method == 'POST':
        cart_item = get_object_or_404(CartItem, id=item_id, cart__user=request.user)
        cart = cart_item.cart
        cart_item.delete()
        
        return JsonResponse({
            'message': 'Item removed from cart',
            'cart_total': cart.total_items,
            'cart_subtotal': float(cart.total_price)
        })
    
    return JsonResponse({'error': 'Invalid request'}, status=400)

@login_required
def checkout(request):
    cart = get_object_or_404(Cart, user=request.user)
    
    if cart.items.count() == 0:
        messages.error(request, 'Your cart is empty')
        return redirect('cart_summary')
    
    if request.method == 'POST':
        # Create the order
        order = Order.objects.create(
            user=request.user,
            full_name=request.POST.get('full_name'),
            email=request.POST.get('email'),
            phone=request.POST.get('phone'),
            address=request.POST.get('address'),
            city=request.POST.get('city'),
            state=request.POST.get('state'),
            postal_code=request.POST.get('postal_code'),
            country=request.POST.get('country'),
            payment_method=request.POST.get('payment_method'),
            shipping_cost=Decimal('10.00'),  # You can make this dynamic
            total_amount=cart.total_price + Decimal('10.00')
        )
        
        # Create order items
        for cart_item in cart.items.all():
            if cart_item.quantity > cart_item.product.stock:
                order.delete()
                messages.error(request, f'Sorry, {cart_item.product.name} is out of stock')
                return redirect('cart_summary')
            
            OrderItem.objects.create(
                order=order,
                product=cart_item.product,
                quantity=cart_item.quantity,
                price=cart_item.product.price
            )
            
            # Update product stock
            product = cart_item.product
            product.stock -= cart_item.quantity
            product.save()
        
        # Clear the cart
        cart.items.all().delete()
        
        messages.success(request, 'Order placed successfully!')
        return redirect('order_confirmation', order_number=order.order_number)
    
    context = {
        'cart': cart,
        'shipping_cost': Decimal('10.00')  # You can make this dynamic
    }
    return render(request, 'main/checkout.html', context)

@login_required
def order_confirmation(request, order_number):
    """
    Display the order confirmation page for a specific order.
    """
    try:
        order = Order.objects.get(order_number=order_number, user=request.user)
        return render(request, 'main/order_confirmation.html', {'order': order})
    except Order.DoesNotExist:
        messages.error(request, 'Order not found.')
        return redirect('orders_list')

@login_required
def order_history(request):
    orders = Order.objects.filter(user=request.user).order_by('-created_at')
    return render(request, 'main/order_history.html', {'orders': orders})

@login_required
def order_detail(request, order_number):
    order = get_object_or_404(Order, order_number=order_number, user=request.user)
    return render(request, 'main/order_detail.html', {'order': order})

@login_required
def wishlist(request):
    wishlist_items = Wishlist.objects.filter(user=request.user)
    return render(request, 'main/wishlist.html', {'wishlist_items': wishlist_items})

@login_required
def add_to_wishlist(request, product_id):
    if request.method == 'POST':
        product = get_object_or_404(Product, id=product_id)
        
        # Check if item already in wishlist
        wishlist_item, created = Wishlist.objects.get_or_create(
            user=request.user,
            product=product
        )
        
        if created:
            message = 'Product added to wishlist'
        else:
            message = 'Product already in wishlist'
            
        return JsonResponse({
            'message': message,
            'wishlist_count': Wishlist.objects.filter(user=request.user).count()
        })
    
    return JsonResponse({'error': 'Invalid request'}, status=400)

@login_required
def remove_from_wishlist(request, item_id):
    if request.method == 'POST':
        wishlist_item = get_object_or_404(Wishlist, id=item_id, user=request.user)
        wishlist_item.delete()
        
        return JsonResponse({
            'message': 'Item removed from wishlist',
            'wishlist_count': Wishlist.objects.filter(user=request.user).count()
        })
    
    return JsonResponse({'error': 'Invalid request'}, status=400)
