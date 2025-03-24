import os
from typing import Dict, Any
from dataclasses import dataclass
from enum import Enum
from trino.auth import BasicAuthentication
from app.services.logger import setup_logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize logger
logger = setup_logging(__name__)


class DatabaseType(Enum):
    """Supported database types."""
    TRINO = "trino"
    MYSQL = "mysql"
    MONGODB = "mongodb"


@dataclass
class AppConfig:
    """Application configuration."""
    active_database: DatabaseType

    @classmethod
    def from_env(cls) -> 'AppConfig':
        """Create configuration from environment variables."""
        db_type = os.getenv('ACTIVE_DATABASE', 'trino').lower()
        if db_type not in [e.value for e in DatabaseType]:
            raise ValueError(f"Invalid database type: {db_type}")
        return cls(active_database=DatabaseType(db_type))

    @property
    def is_trino_active(self) -> bool:
        return self.active_database == DatabaseType.TRINO

    @property
    def is_mysql_active(self) -> bool:
        return self.active_database == DatabaseType.MYSQL

    @property
    def is_mongodb_active(self) -> bool:
        return self.active_database == DatabaseType.MONGODB


@dataclass
class TrinoConfig:
    """Trino connection configuration."""
    host: str
    port: int
    user: str
    password: str
    catalog: str
    schema: str
    http_scheme: str
    verify: bool = False

    @classmethod
    def from_env(cls) -> 'TrinoConfig':
        """Create configuration from environment variables."""
        return cls(
            host=os.getenv('TRINO_HOST', 'SRV24682.agri-bank.com'),
            port=int(os.getenv('TRINO_PORT', '8443')),
            user=os.getenv('TRINO_USER', 'admin'),
            password=os.getenv('TRINO_PASSWORD', 'P@ssw0rd'),
            catalog=os.getenv('TRINO_CATALOG', 'hive'),
            schema=os.getenv('TRINO_SCHEMA', 'dw'),
            http_scheme=os.getenv('TRINO_HTTP_SCHEME', 'https'),
            verify=os.getenv('TRINO_VERIFY', 'false').lower() == 'true'
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary format."""
        return {
            "host": self.host,
            "port": self.port,
            "user": self.user,
            "auth": BasicAuthentication(self.user, self.password),
            "catalog": self.catalog,
            "schema": self.schema,
            "http_scheme": self.http_scheme,
            "verify": self.verify
        }


@dataclass
class MySQLConfig:
    """MySQL connection configuration."""
    host: str
    user: str
    password: str
    database: str = None
    port: int = 3306

    @classmethod
    def from_env(cls) -> 'MySQLConfig':
        """Create configuration from environment variables."""
        return cls(
            host=os.getenv('MYSQL_HOST', '10.0.246.86'),
            user=os.getenv('MYSQL_USER', 'hadoop'),
            password=os.getenv('MYSQL_PASSWORD', 'P@ssw0rd'),
            database=os.getenv('MYSQL_DATABASE'),
            port=int(os.getenv('MYSQL_PORT', '3306'))
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary format."""
        config = {
            "host": self.host,
            "user": self.user,
            "password": self.password,
            "port": self.port
        }
        if self.database:
            config["database"] = self.database
        return config


@dataclass
class MongoConfig:
    """MongoDB connection configuration."""
    host: str
    port: int
    username: str = None
    password: str = None
    database: str = None
    auth_source: str = 'admin'
    auth_mechanism: str = 'SCRAM-SHA-256'

    @classmethod
    def from_env(cls) -> 'MongoConfig':
        """Create configuration from environment variables."""
        return cls(
            host=os.getenv('MONGO_HOST', 'localhost'),
            port=int(os.getenv('MONGO_PORT', '27017')),
            username=os.getenv('MONGO_USER'),
            password=os.getenv('MONGO_PASSWORD'),
            database=os.getenv('MONGO_DATABASE'),
            auth_source=os.getenv('MONGO_AUTH_SOURCE', 'admin'),
            auth_mechanism=os.getenv('MONGO_AUTH_MECHANISM', 'SCRAM-SHA-256')
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary format."""
        config = {
            "host": self.host,
            "port": self.port
        }

        if self.username and self.password:
            config.update({
                "username": self.username,
                "password": self.password,
                "authSource": self.auth_source,
                "authMechanism": self.auth_mechanism
            })

        if self.database:
            config["database"] = self.database

        return config


def validate_config(config: Dict[str, Any], required_fields: list[str]) -> None:
    """
    Validate configuration dictionary.

    Args:
        config: Configuration dictionary to validate
        required_fields: List of required field names

    Raises:
        ValueError: If required fields are missing or empty
    """
    missing_fields = [
        field for field in required_fields
        if field not in config or not config[field]
    ]

    if missing_fields:
        raise ValueError(f"Missing required configuration fields: {', '.join(missing_fields)}")


def trino_conn_config() -> Dict[str, Any]:
    """
    Get Trino connection configuration.

    Returns:
        dict: Connection configuration dictionary

    Raises:
        ValueError: If configuration is invalid
    """
    try:
        config = TrinoConfig.from_env()
        conn_dict = config.to_dict()

        required_fields = ['host', 'port', 'user', 'auth', 'catalog', 'schema']
        validate_config(conn_dict, required_fields)

        return conn_dict
    except Exception as e:
        logger.error(f"Error in trino_conn_config: {e}")
        raise


def mysql_conn_config() -> Dict[str, Any]:
    """
    Get MySQL connection configuration.

    Returns:
        dict: Connection configuration dictionary

    Raises:
        ValueError: If configuration is invalid
    """
    try:
        config = MySQLConfig.from_env()
        conn_dict = config.to_dict()

        required_fields = ['host', 'user', 'password']
        validate_config(conn_dict, required_fields)

        return conn_dict
    except Exception as e:
        logger.error(f"Error in mysql_conn_config: {e}")
        raise


def mongo_conn_config() -> Dict[str, Any]:
    """
    Get MongoDB connection configuration.

    Returns:
        dict: Connection configuration dictionary

    Raises:
        ValueError: If configuration is invalid
    """
    try:
        config = MongoConfig.from_env()
        conn_dict = config.to_dict()

        required_fields = ['host', 'port']
        validate_config(conn_dict, required_fields)

        return conn_dict
    except Exception as e:
        raise
        logger.error(f"Error in mongo_conn_config: {e}")
