# Simple API Generator

[//]: # (![License]&#40;https://img.shields.io/badge/license-MIT-blue.svg&#41;)
![Python](https://img.shields.io/badge/python-3.8+-green.svg)
![Flask](https://img.shields.io/badge/flask-2.0+-orange.svg)

A powerful, easy-to-use web application for generating and managing RESTful APIs without writing code. Built with Flask, this tool streamlines API development for developers and non-developers alike.

## 📋 Table of Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## ✨ Features

- **Intuitive API Builder**: Drag-and-drop interface for creating API endpoints
- **User Authentication System**: Secure login, registration, and profile management
- **Role-Based Access Control**: Granular permissions for different user types
- **Automatic Documentation**: Swagger/OpenAPI specs generated automatically
- **Database Integration**: Connect to various databases with a simple setup
- **Validation Rules**: Built-in input validation with customizable rules
- **Versioning**: Support for API versioning and deprecation management
- **Comprehensive Logging**: Detailed logs for debugging and monitoring
- **Multi-Environment Configuration**: Different settings for development, testing, and production

## 📸 Screenshots

*Coming soon*

## 🔧 Prerequisites

- Python 3.8 or higher
- pip (Python package installer)
- Virtual environment (recommended)
- Git

## 🚀 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/Simple-API-Generator.git
cd Simple-API-Generator
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

## ⚙️ Configuration

Create a `.env` file in the root directory with the following variables:

```
SECRET_KEY=your-secure-secret-key
FLASK_ENV=development  # Change to production for deployment
DATABASE_URL=sqlite:///app.db  # Or your preferred database URL

# Email configuration (optional)
MAIL_SERVER=smtp.example.com
MAIL_PORT=587
MAIL_USERNAME=your-email@example.com
MAIL_PASSWORD=your-email-password
MAIL_USE_TLS=True
```

## 🏃‍♂️ Running the Application

1. Initialize the database:
```bash
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

2. Run the development server:
```bash
python run.py
```
or
```bash
flask run
```

The application will be available at `http://localhost:5000`

## 📚 API Documentation

Once the application is running, access the automatically generated API documentation:

- Swagger UI: `http://localhost:5000/api/docs`
- ReDoc: `http://localhost:5000/api/redoc`

## 📁 Project Structure

```
Simple-API-Generator/
├── app/                  # Application package
│   ├── __init__.py       # Initialize app and register blueprints
│   ├── models/           # Database models
│   ├── routes/           # API routes and view functions
│   ├── services/         # Business logic
│   ├── templates/        # HTML templates
│   └── static/           # CSS, JS, images
├── config/               # Configuration files
│   └── config.py         # App configuration
├── migrations/           # Database migrations
├── tests/                # Test suite
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── conftest.py       # Test fixtures
├── instance/             # Instance-specific files
├── .env                  # Environment variables (create this)
├── .gitignore            # Git ignore file
├── requirements.txt      # Dependencies
├── run.py                # Application entry point
└── README.md             # This file
```

## 🧪 Testing

Run the test suite:
```bash
python -m pytest
```

Run tests with coverage report:
```bash
python -m pytest --cov=app tests/
```

## 🌐 Deployment

### Deploying to Heroku

1. Install the Heroku CLI and log in
2. In your project directory:
```bash
heroku create your-app-name
git push heroku main
heroku config:set SECRET_KEY=your-secret-key
heroku config:set FLASK_ENV=production
# Set other environment variables as needed
heroku open
```

### Deploying with Docker

```bash
docker build -t simple-api-generator .
docker run -p 5000:5000 simple-api-generator
```

## 🔍 Troubleshooting

### Common Issues

1. **Database connection errors**
   - Check your DATABASE_URL in the .env file
   - Ensure your database server is running

2. **Package dependency issues**
   - Try `pip install -r requirements.txt --upgrade`
   - Check for conflicting package versions

3. **Application not starting**
   - Check the logs for specific error messages
   - Verify that the required environment variables are set

## 👥 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

Please make sure your code follows our coding standards and includes appropriate tests.

## 📄 License


## 🙏 Acknowledgments

- Flask and its extensions
- SQLAlchemy ORM
- All our contributors and users

## 📧 Contact

For security issues, please email RezaNasirian18@gamil.com

For general inquiries, open an issue on GitHub.