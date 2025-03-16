# Wave Logistics

A modern logistics and delivery management system built with Django, featuring sophisticated animations and a premium user interface.

[![CI/CD](https://github.com/Randylomo1/wave/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Randylomo1/wave/actions/workflows/ci-cd.yml)

## Features

- 🎨 Modern UI with GSAP-powered animations
- 🔒 Secure authentication and authorization
- 💳 Multiple payment gateways (M-Pesa, PayPal, Stripe)
- 📦 Real-time order tracking
- 🛒 Shopping cart and wishlist functionality
- 📱 Responsive design and PWA support
- 🔍 Advanced product search and filtering
- 📊 Admin dashboard for business analytics

## Tech Stack

### Frontend
- HTML5, CSS3, JavaScript (ES6+)
- GSAP Animation Library
- Progressive Web App (PWA)
- Responsive Design with CSS Grid/Flexbox

### Backend
- Django 5.0.3
- Django REST Framework
- JWT Authentication
- SQLite (Development) / PostgreSQL (Production)

### Payment Integration
- M-Pesa Integration
- PayPal REST SDK
- Stripe Payment Gateway

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Randylomo1/wave.git
cd wave
```

2. Create and activate virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
.\venv\Scripts\activate   # Windows
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. Run migrations:
```bash
python manage.py migrate
```

6. Create superuser:
```bash
python manage.py createsuperuser
```

7. Run development server:
```bash
python manage.py runserver
```

## Project Structure

```
wave-logistics/
├── main/                   # Main application
│   ├── migrations/        # Database migrations
│   ├── templates/        # HTML templates
│   ├── static/          # Static files (CSS, JS, images)
│   ├── models.py        # Database models
│   ├── views.py         # View logic
│   └── urls.py          # URL routing
├── static/               # Global static files
├── templates/            # Global templates
├── wave_logistics/       # Project configuration
├── requirements.txt      # Python dependencies
└── manage.py            # Django management script
```

## API Documentation

### Authentication
- POST `/api/token/` - Obtain JWT token
- POST `/api/token/refresh/` - Refresh JWT token

### Products
- GET `/api/products/` - List all products
- GET `/api/products/{id}/` - Get product details
- POST `/api/products/` - Create new product (Admin only)

### Orders
- GET `/api/orders/` - List user's orders
- POST `/api/orders/` - Create new order
- GET `/api/orders/{tracking_number}/` - Get order details

### Payments
- POST `/api/payments/initiate/` - Initiate payment
- POST `/api/payments/process/` - Process payment
- POST `/api/payments/callback/` - Payment gateway callback

## Testing

Run tests with coverage:
```bash
coverage run manage.py test
coverage report
```

## CI/CD Pipeline

Our CI/CD pipeline includes:
- Automated testing
- Code quality checks
- Security scanning
- Automated deployments

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Security

- All payments are processed through secure payment gateways
- JWT authentication for API security
- CSRF protection enabled
- XSS prevention measures
- Regular security updates

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- GSAP Animation Library
- Django Framework
- Payment Gateway Providers
- Open Source Community

## Security Features

- CSRF protection
- XSS prevention
- Input sanitization
- Content Security Policy
- Secure session handling
- HTTPS enforcement
- Rate limiting
- Secure headers

## Prerequisites

- Python 3.12+
- pip
- Virtual environment
- M-Pesa developer account (for payment integration)

## Usage

1. Fill out the logistics form with delivery details
2. Submit the form
3. Complete M-Pesa payment when prompted
4. Track delivery status

## Development

- Follow PEP 8 style guide
- Write tests for new features
- Update documentation as needed
- Use meaningful commit messages

## Security Considerations

- Never commit sensitive data
- Keep dependencies updated
- Follow security best practices
- Regularly update security measures

## Contact

- Developer: Randy Molo
- Email: molorandyc4@gmail.com
- Phone: +254797584227 