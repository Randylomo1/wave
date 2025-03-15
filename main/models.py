from django.db import models

# Create your models here.

class MpesaPayment(models.Model):
    phone_number = models.CharField(max_length=15)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reference = models.CharField(max_length=100)
    description = models.TextField()
    transaction_id = models.CharField(max_length=100, null=True, blank=True)
    transaction_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='pending')
    result_code = models.CharField(max_length=100, null=True, blank=True)
    result_description = models.TextField(null=True, blank=True)
    
    class Meta:
        ordering = ['-transaction_date']
    
    def __str__(self):
        return f"{self.phone_number} - {self.amount} - {self.status}"
