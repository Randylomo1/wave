# Wave Logistics

A modern logistics management system built with Django, featuring M-Pesa integration for payments.

## Features

- Modern, responsive UI
- Secure form handling
- M-Pesa payment integration
- Real-time payment status updates
- Input validation and sanitization
- Security best practices implementation

## Tech Stack

- Python 3.12
- Django 5.0.3
- django-daraja (M-Pesa integration)
- JavaScript (ES6+)
- HTML5/CSS3

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

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/wave-logistics.git
cd wave-logistics
```

2. Create and activate virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create .env file and add your configuration:
```env
DEBUG=True
SECRET_KEY=your-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1

# M-Pesa Configuration
MPESA_ENVIRONMENT=sandbox
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=174379
MPESA_EXPRESS_SHORTCODE=174379
MPESA_SHORTCODE_TYPE=paybill
MPESA_PASSKEY=your_passkey
MPESA_INITIATOR_USERNAME=testapi
MPESA_INITIATOR_SECURITY_CREDENTIAL=your_credential
```

5. Run migrations:
```bash
python manage.py migrate
```

6. Run the development server:
```bash
python manage.py runserver
```

Visit http://127.0.0.1:8000/ to see the application.

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

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

- Developer: Randy Molo
- Email: molorandyc4@gmail.com
- Phone: +254797584227 