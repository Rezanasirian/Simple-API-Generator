"""
Database configuration settings for the API Generator.
Supports multiple database types including SQLite, MySQL, PostgreSQL, and MongoDB.
"""

import os
import json
from dotenv import load_dotenv

# Load environment variables from .env file if present
load_dotenv()

# Default settings
DEFAULT_DB_TYPE = os.environ.get('DB_TYPE', 'sqlite')
DEFAULT_DB_HOST = os.environ.get('DB_HOST', 'localhost')
DEFAULT_DB_PORT = os.environ.get('DB_PORT', '3306')  # MySQL default
DEFAULT_DB_USER = os.environ.get('DB_USER', 'root')
DEFAULT_DB_PASSWORD = os.environ.get('DB_PASSWORD', '')
DEFAULT_DB_NAME = os.environ.get('DB_NAME', 'app')
DEFAULT_SQLITE_PATH = os.environ.get('SQLITE_PATH', 'instance/app.db')

# MongoDB specific defaults
DEFAULT_MONGO_URI = os.environ.get('MONGO_URI', '')
DEFAULT_MONGO_AUTH_SOURCE = os.environ.get('MONGO_AUTH_SOURCE', 'admin')
DEFAULT_MONGO_AUTH_MECHANISM = os.environ.get('MONGO_AUTH_MECHANISM', 'SCRAM-SHA-256')

# Config file path
DB_CONFIG_FILE = os.environ.get('DB_CONFIG_FILE', 'config/db_config.json')

class DatabaseConfig:
    """Database configuration handler class"""
    
    @staticmethod
    def get_database_uri(db_type=None, host=None, port=None, user=None, password=None, db_name=None, sqlite_path=None, **kwargs):
        """
        Generate a database URI based on the provided configuration.
        If parameters are not provided, defaults or environment variables will be used.
        """
        # Use provided values or defaults
        db_type = db_type or DEFAULT_DB_TYPE
        db_type = db_type.lower()
        
        # Handle different database types
        if db_type == 'sqlite':
            sqlite_path = sqlite_path or DEFAULT_SQLITE_PATH
            return f"sqlite:///{sqlite_path}"
        
        # For other database types, get connection parameters
        host = host or DEFAULT_DB_HOST
        port = port or DEFAULT_DB_PORT
        user = user or DEFAULT_DB_USER
        password = password or DEFAULT_DB_PASSWORD
        db_name = db_name or DEFAULT_DB_NAME
        
        # Format password for URI if it exists
        password_str = f":{password}" if password else ""
        
        # Generate database URI based on type
        if db_type == 'mysql':
            return f"mysql+pymysql://{user}{password_str}@{host}:{port}/{db_name}"
        elif db_type == 'postgresql' or db_type == 'postgres':
            return f"postgresql://{user}{password_str}@{host}:{port}/{db_name}"
        elif db_type == 'mssql':
            return f"mssql+pyodbc://{user}{password_str}@{host}:{port}/{db_name}?driver=ODBC+Driver+17+for+SQL+Server"
        elif db_type == 'oracle':
            return f"oracle://{user}{password_str}@{host}:{port}/{db_name}"
        elif db_type == 'mongodb':
            # Check if a full MongoDB URI is provided in kwargs
            mongo_uri = kwargs.get('mongo_uri', DEFAULT_MONGO_URI)
            if mongo_uri:
                return mongo_uri
                
            # Build MongoDB URI
            auth_source = kwargs.get('auth_source', DEFAULT_MONGO_AUTH_SOURCE)
            auth_mechanism = kwargs.get('auth_mechanism', DEFAULT_MONGO_AUTH_MECHANISM)
            
            # Format the URI components
            auth_params = f"?authSource={auth_source}&authMechanism={auth_mechanism}" if auth_source else ""
            
            # Create the MongoDB URI
            if user and password:
                return f"mongodb://{user}:{password}@{host}:{port}/{db_name}{auth_params}"
            else:
                return f"mongodb://{host}:{port}/{db_name}{auth_params}"
        else:
            # Default to SQLite if type is not recognized
            return f"sqlite:///{DEFAULT_SQLITE_PATH}"
    
    @staticmethod
    def get_config():
        """Get the full database configuration dictionary from the config file or defaults"""
        config = {
            'db_type': DEFAULT_DB_TYPE,
            'host': DEFAULT_DB_HOST,
            'port': DEFAULT_DB_PORT,
            'user': DEFAULT_DB_USER,
            'password': DEFAULT_DB_PASSWORD,
            'db_name': DEFAULT_DB_NAME,
            'sqlite_path': DEFAULT_SQLITE_PATH,
            'mongo_uri': DEFAULT_MONGO_URI,
            'mongo_auth_source': DEFAULT_MONGO_AUTH_SOURCE,
            'mongo_auth_mechanism': DEFAULT_MONGO_AUTH_MECHANISM
        }
        
        # Try to load from config file if it exists
        if os.path.exists(DB_CONFIG_FILE):
            try:
                with open(DB_CONFIG_FILE, 'r') as f:
                    file_config = json.load(f)
                    config.update(file_config)
            except Exception as e:
                print(f"Error loading database config file: {str(e)}")
        
        # Add the connection URI
        if config['db_type'] == 'mongodb':
            config['uri'] = DatabaseConfig.get_database_uri(**config)
        else:
            config['uri'] = DatabaseConfig.get_database_uri(
                db_type=config['db_type'],
                host=config['host'],
                port=config['port'],
                user=config['user'],
                password=config['password'],
                db_name=config['db_name'],
                sqlite_path=config['sqlite_path']
            )
            
        return config
    
    @staticmethod
    def save_config(config):
        """Save the configuration to a JSON file"""
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(DB_CONFIG_FILE), exist_ok=True)
        
        # Remove the URI since it's generated
        if 'uri' in config:
            del config['uri']
            
        try:
            with open(DB_CONFIG_FILE, 'w') as f:
                json.dump(config, f, indent=4)
            return True
        except Exception as e:
            print(f"Error saving database config: {str(e)}")
            return False
    
    @staticmethod
    def get_database_types():
        """Get a list of supported database types with their default ports"""
        return {
            'sqlite': {'name': 'SQLite', 'default_port': None, 'description': 'Lightweight file-based database'},
            'mysql': {'name': 'MySQL', 'default_port': 3306, 'description': 'Popular open-source relational database'},
            'postgresql': {'name': 'PostgreSQL', 'default_port': 5432, 'description': 'Advanced open-source database with JSON support'},
            'mssql': {'name': 'Microsoft SQL Server', 'default_port': 1433, 'description': 'Microsoft enterprise database solution'},
            'oracle': {'name': 'Oracle', 'default_port': 1521, 'description': 'Enterprise-class database management system'},
            'mongodb': {'name': 'MongoDB', 'default_port': 27017, 'description': 'NoSQL document database'}
        } 