# Wave Logistics

A modern logistics and delivery management system built with Django, featuring sophisticated animations and a premium user interface.

## Features

- 🚀 Modern, responsive design with premium animations
- 💫 GSAP-powered smooth transitions and effects
- 🎨 Advanced 3D effects and parallax scrolling
- 🖱️ Interactive mouse trails and magnetic buttons
- 🌊 Dynamic SVG animations and particle systems
- 📱 Progressive Web App (PWA) support
- 🔒 Secure authentication system
- 📦 Product and order management
- 💝 Wishlist functionality
- 🛒 Shopping cart system

## Technologies Used

- **Frontend**:
  - HTML5, CSS3, JavaScript (ES6+)
  - GSAP (GreenSock Animation Platform)
  - CSS Grid & Flexbox
  - Progressive Web App features
  - Responsive Design

- **Backend**:
  - Django
  - SQLite/PostgreSQL
  - Django REST Framework
  - Celery (for background tasks)

- **Animation Libraries**:
  - GSAP Core
  - ScrollTrigger Plugin
  - MotionPath Plugin

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/wave-logistics.git
   cd wave-logistics
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv env
   source env/bin/activate  # On Windows: env\Scripts\activate
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

6. Create a superuser:
   ```bash
   python manage.py createsuperuser
   ```

7. Run the development server:
   ```bash
   python manage.py runserver
   ```

## Project Structure

```
wave-logistics/
├── main/                   # Main Django app
│   ├── templates/         # HTML templates
│   ├── static/           # Static files
│   └── views.py          # View logic
├── static/                # Global static files
│   ├── css/             # CSS files
│   ├── js/              # JavaScript files
│   └── img/             # Images
└── manage.py             # Django management script
```

## Animation System

The project features a sophisticated animation system built with GSAP:

- Background animations with floating orbs
- Mouse trail effects
- Magnetic buttons
- Smooth scroll implementations
- Particle systems
- SVG morphing
- 3D transformations
- Parallax effects

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- GSAP by GreenSock
- Django Community
- Font Awesome
- All contributors and supporters

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