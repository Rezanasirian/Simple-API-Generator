from contextlib import contextmanager
from typing import Generator, Any, Dict, Optional, Union, List
from trino.dbapi import Connection as TrinoConnection, connect as trino_connect
from pymongo import MongoClient, errors as mongo_errors
from pymongo.database import Database as MongoDatabase
from pymongo.collection import Collection as MongoCollection
import mysql.connector
from mysql.connector.pooling import MySQLConnectionPool
from SimpleApiGenerator.services.connection_configs import (
    trino_conn_config,
    mysql_conn_config,
    mongo_conn_config,
    AppConfig,
    DatabaseType
)
from services.logger import setup_logging
from tenacity import retry, stop_after_attempt, wait_exponential

# Initialize logger
logger = setup_logging(__name__)


class DatabaseConnectionError(Exception):
    """Custom exception for database connection errors."""
    pass

#
# class TrinoConnectionPool:
#     """Connection pool for Trino database."""
#
#     def __init__(self, max_connections: int = 5):
#         """
#         Initialize the connection pool.
#
#         Args:
#             max_connections: Maximum number of connections to maintain
#         """
#         self.max_connections = max_connections
#         self.connections: list[TrinoConnection] = []
#         self.config = trino_conn_config()
#
#     def _create_connection(self) -> TrinoConnection:
#         """Create a new database connection."""
#         try:
#             connection = trino_connect(**self.config)
#             return connection
#         except Exception as e:
#             logger.error(f"Failed to create Trino connection: {e}")
#             raise DatabaseConnectionError(f"Could not create Trino connection: {e}")
#
#     @retry(
#         stop=stop_after_attempt(3),
#         wait=wait_exponential(multiplier=1, min=4, max=10),
#         reraise=True
#     )
#     def get_connection(self) -> TrinoConnection:
#         """
#         Get a database connection from the pool.
#
#         Returns:
#             Connection: A database connection
#
#         Raises:
#             DatabaseConnectionError: If unable to get a connection
#         """
#         try:
#             # Try to reuse an existing connection
#             if self.connections:
#                 connection = self.connections.pop()
#                 try:
#                     # Test if connection is still valid
#                     with connection.cursor() as cursor:
#                         cursor.execute("SELECT 1")
#                     return connection
#                 except Exception:
#                     # Connection is invalid, create new one
#                     logger.warning("Found stale Trino connection, creating new one")
#                     connection.close()
#
#             # Create new connection if needed
#             if len(self.connections) < self.max_connections:
#                 return self._create_connection()
#
#             raise DatabaseConnectionError("Maximum Trino connections reached")
#
#         except Exception as e:
#             logger.error(f"Error getting Trino connection: {e}")
#             raise DatabaseConnectionError(f"Failed to get Trino connection: {e}")
#
#     def return_connection(self, connection: TrinoConnection) -> None:
#         """
#         Return a connection to the pool.
#
#         Args:
#             connection: The connection to return
#         """
#         if len(self.connections) < self.max_connections:
#             self.connections.append(connection)
#         else:
#             connection.close()
#
#     def close_all(self) -> None:
#         """Close all connections in the pool."""
#         for connection in self.connections:
#             try:
#                 connection.close()
#             except Exception as e:
#                 logger.error(f"Error closing Trino connection: {e}")
#         self.connections.clear()


class MongoDBConnection:
    """MongoDB connection manager."""

    def __init__(self):
        self.config = mongo_conn_config()
        self.client: Optional[MongoClient] = None

    def connect(self) -> MongoClient:
        """Create MongoDB connection."""
        try:
            if not self.client:
                self.client = MongoClient(**self.config)

            return self.client
        except mongo_errors.ConnectionError as e:
            logger.error(f"MongoDB connection error: {e}")
            raise DatabaseConnectionError(f"MongoDB connection failed: {e}")

    def get_database(self, database_name: str) -> MongoDatabase:
        """Get MongoDB database."""
        print(self.connect()[database_name])
        return self.connect()[database_name]

    def get_collection(self, database_name: str, collection_name: str) -> MongoCollection:
        """Get MongoDB collection."""
        return self.get_database(database_name)[collection_name]

    def close(self) -> None:
        """Close MongoDB connection."""
        if self.client:
            try:
                self.client.close()
                self.client = None
            except Exception as e:
                logger.error(f"Error closing MongoDB connection: {e}")

#
# class MySQLConnectionManager:
#     """MySQL connection pool manager."""
#
#     def __init__(self, pool_name: str = "mypool", pool_size: int = 5):
#         self.config = mysql_conn_config()
#         self.pool_name = pool_name
#         self.pool_size = pool_size
#         self.pool = None
#         self._create_pool()
#
#     def _create_pool(self) -> None:
#         """Create MySQL connection pool."""
#         try:
#             pool_config = {
#                 "pool_name": self.pool_name,
#                 "pool_size": self.pool_size,
#                 **self.config
#             }
#             self.pool = MySQLConnectionPool(**pool_config)
#         except mysql.connector.Error as e:
#             logger.error(f"Error creating MySQL pool: {e}")
#             raise DatabaseConnectionError(f"Failed to create MySQL pool: {e}")
#
#     @contextmanager
#     def get_connection(self):
#         """Get MySQL connection from pool."""
#         conn = None
#         try:
#             conn = self.pool.get_connection()
#             yield conn
#         except mysql.connector.Error as e:
#             logger.error(f"Error getting MySQL connection: {e}")
#             raise DatabaseConnectionError(f"Failed to get MySQL connection: {e}")
#         finally:
#             if conn:
#                 conn.close()


# Create global connection managers
# trino_pool = TrinoConnectionPool()
mongo_db = MongoDBConnection()
# mysql_pool = MySQLConnectionManager()

#
# @contextmanager
# def get_trino_connection() -> Generator[TrinoConnection, None, None]:
#     """Context manager for Trino connections."""
#     connection = None
#     try:
#         connection = trino_pool.get_connection()
#         yield connection
#     except Exception as e:
#         logger.error(f"Error in Trino connection: {e}")
#         raise DatabaseConnectionError(f"Trino connection error: {e}")
#     finally:
#         if connection:
#             trino_pool.return_connection(connection)

#
# def execute_trino_query(query: str, params: tuple = None) -> list[Any]:
#     """Execute a Trino query safely."""
#     try:
#         with get_trino_connection() as conn:
#             with conn.cursor() as cursor:
#                 if params:
#                     cursor.execute(query, params)
#                 else:
#                     cursor.execute(query)
#                 return cursor.fetchall()
#     except Exception as e:
#         logger.error(f"Error executing Trino query: {e}\nQuery: {query}")
#         raise DatabaseConnectionError(f"Trino query execution failed: {e}")

#
# def execute_mysql_query(query: str, params: tuple = None) -> list[Any]:
#     """Execute a MySQL query safely."""
#     try:
#         with mysql_pool.get_connection() as conn:
#             with conn.cursor() as cursor:
#                 if params:
#                     cursor.execute(query, params)
#                 else:
#                     cursor.execute(query)
#                 return cursor.fetchall()
#     except Exception as e:
#         logger.error(f"Error executing MySQL query: {e}\nQuery: {query}")
#         raise DatabaseConnectionError(f"MySQL query execution failed: {e}")


def execute_mongo_query(database: str, collection: str, query: Dict) -> list[Dict]:
    """Execute a MongoDB query safely."""
    try:
        mongo_collection = mongo_db.get_collection(database, collection)
        return list(mongo_collection.find(query))
    except Exception as e:
        logger.error(f"Error executing MongoDB query: {e}\nQuery: {query}")
        raise DatabaseConnectionError(f"MongoDB query execution failed: {e}")


# Cleanup function to be called on application shutdown
# def cleanup_connections():
#     """Close all database connections."""
#     try:
#         trino_pool.close_all()
#         mongo_db.close()
#         logger.info("All database connections closed")
#     except Exception as e:
#         logger.error(f"Error during connection cleanup: {e}")


# Backwards compatibility
# get_db_connection = get_trino_connection
# execute_query = execute_trino_query


class QueryExecutor:
    """Execute queries across different database types."""

    def __init__(self):
        self.app_config = AppConfig.from_env()
        # self.trino_pool = trino_pool
        self.mongo_db = mongo_db
        # self.mysql_pool = mysql_pool

    def execute_query(
            self,
            query: Union[str, Dict],
            params: tuple = None,
            database: str = None,
            collection: str = None
    ) -> List[Any]:
        """
        Execute a query on the active database.

        Args:
            query: SQL query string for Trino/MySQL or query dict for MongoDB
            params: Query parameters for SQL databases
            database: Database name (required for MongoDB)
            collection: Collection name (required for MongoDB)

        Returns:
            List of query results
        """
        try:
            if self.app_config.is_trino_active:
                pass
                # return self._execute_trino_query(query, params)
            elif self.app_config.is_mysql_active:
                pass
                # return self._execute_mysql_query(query, params)
            elif self.app_config.is_mongodb_active:
                if not database or not collection:
                    raise ValueError("Database and collection names required for MongoDB queries")
                return self._execute_mongo_query(database, collection, query)
            else:
                raise ValueError(f"Unsupported database type: {self.app_config.active_database}")
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            raise DatabaseConnectionError(f"Query execution failed: {e}")
    #
    # def _execute_trino_query(self, query: str, params: tuple = None) -> List[Any]:
    #     """Execute Trino query."""
    #     with get_trino_connection() as conn:
    #         with conn.cursor() as cursor:
    #             if params:
    #                 cursor.execute(query, params)
    #             else:
    #                 cursor.execute(query)
    #             return cursor.fetchall()

    # def _execute_mysql_query(self, query: str, params: tuple = None) -> List[Any]:
    #     """Execute MySQL query."""
    #     with mysql_pool.get_connection() as conn:
    #         with conn.cursor() as cursor:
    #             if params:
    #                 cursor.execute(query, params)
    #             else:
    #                 cursor.execute(query)
    #             return cursor.fetchall()

    def _execute_mongo_query(self, database: str, collection: str, query: Dict) -> List[Dict]:
        """Execute MongoDB query."""
        mongo_collection = mongo_db.get_collection(database, collection)
        return list(mongo_collection.find(query))


# Create global query executor
query_executor = QueryExecutor()


# Update backwards compatibility functions
def execute_query(*args, **kwargs):
    """Backwards compatible query execution."""
    return query_executor.execute_query(*args, **kwargs)