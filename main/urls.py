from django.urls import path
from . import views

app_name = 'main'

urlpatterns = [
    # Product URLs
    path('', views.product_list, name='product_list'),
    path('product/<slug:slug>/', views.product_detail, name='product_detail'),
    path('category/<slug:category_slug>/', views.product_list, name='product_list_by_category'),
    
    # Cart URLs
    path('cart/', views.cart_summary, name='cart_summary'),
    path('cart/add/<int:product_id>/', views.add_to_cart, name='add_to_cart'),
    path('cart/update/<int:item_id>/', views.update_cart, name='update_cart'),
    path('cart/remove/<int:item_id>/', views.remove_from_cart, name='remove_from_cart'),
    
    # Checkout and Order URLs
    path('checkout/', views.checkout, name='checkout'),
    path('order/confirmation/<str:order_number>/', views.order_confirmation, name='order_confirmation'),
    path('orders/', views.order_history, name='order_history'),
    path('order/<str:order_number>/', views.order_detail, name='order_detail'),
    
    # Payment URLs
    path('payment/initiate/', views.initiate_payment, name='initiate_payment'),
    path('payment/process/', views.process_payment, name='process_payment'),
    path('payment/callback/', views.payment_callback, name='payment_callback'),
    
    # Tracking URLs
    path('track/', views.track_order, name='track_order'),
    path('track/<str:tracking_number>/', views.track_order_detail, name='track_order_detail'),
    
    # Wishlist URLs
    path('wishlist/', views.wishlist, name='wishlist'),
    path('wishlist/add/<int:product_id>/', views.add_to_wishlist, name='add_to_wishlist'),
    path('wishlist/remove/<int:item_id>/', views.remove_from_wishlist, name='remove_from_wishlist'),
] 