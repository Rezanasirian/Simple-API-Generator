# Flask API Generator

A web application for generating and managing APIs built with Flask.

## Features

- User authentication and authorization
- API endpoint generation and management
- Role-based access control
- Error handling and logging
- Configuration management for different environments

## Prerequisites

- Python 3.8 or higher
- pip (Python package installer)
- Virtual environment (recommended)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd api-generator
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

4. Set up environment variables:
```bash
# Create a .env file with the following variables
SECRET_KEY=your-secret-key
FLASK_ENV=development
MAIL_SERVER=your-mail-server
MAIL_PORT=587
MAIL_USERNAME=your-email
MAIL_PASSWORD=your-password
```

## Running the Application

1. Initialize the database:
```bash
flask db upgrade
```

2. Run the development server:
```bash
python run.py
```

The application will be available at `http://localhost:5000`

## Testing

Run the test suite:
```bash
python -m pytest
```

## Project Structure

```
api-generator/
├── app/
│   ├── __init__.py
│   ├── models.py
│   ├── main.py
│   └── templates/
├── config/
│   └── config.py
├── tests/
├── instance/
├── requirements.txt
├── run.py
└── README.md
```

## Contributing

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Security

Please report any security issues to security@yourdomain.com 