"""
M-Pesa Integration Module
"""
import base64
import json
import requests
from datetime import datetime
from django.conf import settings

class MpesaClient:
    """M-Pesa API Client"""
    
    def __init__(self):
        self.env = settings.MPESA_ENVIRONMENT
        self.consumer_key = settings.MPESA_CONSUMER_KEY
        self.consumer_secret = settings.MPESA_CONSUMER_SECRET
        self.shortcode = settings.MPESA_SHORTCODE
        self.passkey = settings.MPESA_PASSKEY
        
        if self.env == "sandbox":
            self.base_url = "https://sandbox.safaricom.co.ke"
        else:
            self.base_url = "https://api.safaricom.co.ke"
            
        self.access_token = self.get_access_token()
        
    def get_access_token(self):
        """Get M-Pesa API access token"""
        url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"
        auth = base64.b64encode(f"{self.consumer_key}:{self.consumer_secret}".encode()).decode()
        headers = {"Authorization": f"Basic {auth}"}
        
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()  # Raise exception for non-200 status codes
            return response.json()["access_token"]
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to get access token: {str(e)}")
            
    def generate_password(self, timestamp):
        """Generate M-Pesa API password"""
        password_str = f"{self.shortcode}{self.passkey}{timestamp}"
        return base64.b64encode(password_str.encode()).decode()
        
    def stk_push(self, phone_number, amount, callback_url, account_reference, transaction_desc):
        """Initiate STK Push transaction"""
        if not phone_number.startswith("254"):
            phone_number = f"254{phone_number.lstrip('0')}"
            
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        password = self.generate_password(timestamp)
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }
        
        payload = {
            "BusinessShortCode": self.shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": amount,
            "PartyA": phone_number,
            "PartyB": self.shortcode,
            "PhoneNumber": phone_number,
            "CallBackURL": callback_url,
            "AccountReference": account_reference,
            "TransactionDesc": transaction_desc
        }
        
        try:
            url = f"{self.base_url}/mpesa/stkpush/v1/processrequest"
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"STK push failed: {str(e)}")
            
    def check_payment_status(self, checkout_request_id):
        """Check payment status"""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        password = self.generate_password(timestamp)
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }
        
        payload = {
            "BusinessShortCode": self.shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "CheckoutRequestID": checkout_request_id
        }
        
        try:
            url = f"{self.base_url}/mpesa/stkpushquery/v1/query"
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"Payment status check failed: {str(e)}") 