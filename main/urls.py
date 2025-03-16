from django.urls import path
from . import views

app_name = 'main'

urlpatterns = [
    path('', views.index, name='index'),
    path('products/', views.product_list, name='product_list'),
    path('products/<slug:slug>/', views.product_detail, name='product_detail'),
    path('cart/', views.cart_detail, name='cart_detail'),
    path('cart/add/<int:product_id>/', views.cart_add, name='cart_add'),
    path('cart/remove/<int:product_id>/', views.cart_remove, name='cart_remove'),
    path('wishlist/', views.wishlist_detail, name='wishlist_detail'),
    path('wishlist/add/<int:product_id>/', views.wishlist_add, name='wishlist_add'),
    path('wishlist/remove/<int:product_id>/', views.wishlist_remove, name='wishlist_remove'),
    path('checkout/', views.checkout, name='checkout'),
    path('payment/initiate/', views.initiate_payment, name='initiate_payment'),
    path('payment/process/', views.process_payment, name='process_payment'),
    path('payment/callback/', views.payment_callback, name='payment_callback'),
    path('orders/', views.order_history, name='order_history'),
    path('orders/<str:tracking_number>/', views.track_order_detail, name='track_order_detail'),
    path('mpesa/callback/', views.mpesa_callback, name='mpesa_callback'),
    path('paypal/callback/', views.paypal_callback, name='paypal_callback'),
    path('stripe/webhook/', views.stripe_webhook, name='stripe_webhook'),
] 