"""
API Helper Functions for Enhanced API Features.

This module provides utilities for API documentation, schema validation,
and other advanced API features.
"""

import json
from typing import Dict, Any, List, Optional, Tuple, Union
from pathlib import Path
import re
import datetime
from functools import wraps
from flask import jsonify, request, Response


def generate_swagger_spec(api_config_path: str = 'config/ApiDoc.json') -> Dict[str, Any]:
    """
    Generate Swagger/OpenAPI specification from API configurations.
    
    Args:
        api_config_path: Path to the API configuration file
        
    Returns:
        OpenAPI specification as a dictionary
    """
    # Load API configurations
    with open(api_config_path, 'r', encoding='utf-8') as file:
        api_config = json.load(file)
    
    # Base OpenAPI specification
    swagger_spec = {
        "openapi": "3.0.0",
        "info": {
            "title": "API Generator",
            "description": "Dynamically generated APIs",
            "version": "1.0.0",
            "contact": {
                "name": "API Support",
                "email": "RezaNasirian@son.com"
            }
        },
        "servers": [
            {
                "url": "/api",
                "description": "API server"
            }
        ],
        "paths": {},
        "components": {
            "schemas": {},
            "securitySchemes": {
                "apiKey": {
                    "type": "apiKey",
                    "in": "header",
                    "name": "X-API-KEY"
                }
            }
        }
    }
    
    # Generate paths and schemas for each API
    for api_name, config in api_config.items():
        path = f"/{api_name}"
        
        # Define request schema based on API conditions
        request_schema = {
            "type": "object",
            "properties": {}
        }
        
        required_fields = []
        
        for condition_group in config.get('Conditions', []):
            for param_name, condition in condition_group.items():
                # Skip duplicate parameters (in case of repeated conditions)
                if param_name in request_schema["properties"]:
                    continue
                
                property_spec = {
                    "description": condition.get('Name', param_name)
                }
                
                # Set type based on data_type
                data_type = condition.get('data_type', 'string')
                if data_type == 'integer':
                    property_spec["type"] = "integer"
                    
                    # Add validation if available
                    validation = condition.get('validation', {})
                    if 'min' in validation:
                        property_spec["minimum"] = validation['min']
                    if 'max' in validation:
                        property_spec["maximum"] = validation['max']
                        
                elif data_type == 'string':
                    property_spec["type"] = "string"
                    
                    # Add validation if available
                    validation = condition.get('validation', {})
                    if 'min_length' in validation:
                        property_spec["minLength"] = validation['min_length']
                    if 'max_length' in validation:
                        property_spec["maxLength"] = validation['max_length']
                    if 'pattern' in validation:
                        property_spec["pattern"] = validation['pattern']
                
                # Add example value if possible
                # TODO: Generate sensible examples based on parameter constraints
                
                # Add to request schema
                request_schema["properties"][param_name] = property_spec
                
                # Add to required fields if necessary
                if condition.get('required', False):
                    required_fields.append(param_name)
        
        if required_fields:
            request_schema["required"] = required_fields
        
        # Define response schema based on fields configuration
        response_schema = {
            "type": "object",
            "properties": {
                "api_name": {"type": "string"},
                "api_version": {"type": "string"},
                "total_records": {"type": "integer"},
                "database": {
                    "type": "object",
                    "properties": {
                        "type": {"type": "string"},
                        "name": {"type": "string"},
                        "table": {"type": "string"}
                    }
                },
                "data": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {}
                    }
                },
                "pagination": {
                    "type": "object",
                    "properties": {
                        "limit": {"type": "integer"},
                        "offset": {"type": "integer"},
                        "total": {"type": "integer"},
                        "page": {"type": "integer"},
                        "total_pages": {"type": "integer"}
                    }
                },
                "ordering": {
                    "type": "object",
                    "properties": {
                        "field": {"type": "string"},
                        "direction": {"type": "string", "enum": ["ASC", "DESC"]}
                    }
                }
            }
        }
        
        # Add response data fields
        data_schema = response_schema["properties"]["data"]["items"]["properties"]
        for field in config.get('response', {}).get('fields', []):
            # Simple assumption of string type for all fields - could be improved
            data_schema[field] = {"type": "string"}
        
        # Add transformations as fields
        for field, _ in config.get('response', {}).get('transformations', {}).items():
            data_schema[field] = {"type": "string"}
        
        # Add path to OpenAPI spec
        swagger_spec["paths"][path] = {
            "post": {
                "summary": config.get('name', api_name),
                "description": config.get('description', f"API for {api_name}"),
                "operationId": f"execute_{api_name}",
                "parameters": [
                    {
                        "name": "limit",
                        "in": "query",
                        "schema": {
                            "type": "integer",
                            "default": config.get('pagination', {}).get('default_limit', 50)
                        },
                        "description": "Number of records to return"
                    },
                    {
                        "name": "offset",
                        "in": "query",
                        "schema": {
                            "type": "integer",
                            "default": 0
                        },
                        "description": "Offset for pagination"
                    },
                    {
                        "name": "order_by",
                        "in": "query",
                        "schema": {
                            "type": "string",
                            "default": config.get('ordering', {}).get('default_field', '')
                        },
                        "description": "Field to order by"
                    },
                    {
                        "name": "order_direction",
                        "in": "query",
                        "schema": {
                            "type": "string",
                            "enum": ["ASC", "DESC"],
                            "default": config.get('ordering', {}).get('default_direction', 'ASC')
                        },
                        "description": "Sort direction"
                    }
                ],
                "requestBody": {
                    "description": "Query parameters",
                    "content": {
                        "application/json": {
                            "schema": request_schema
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "Successful response",
                        "content": {
                            "application/json": {
                                "schema": response_schema
                            }
                        }
                    },
                    "400": {
                        "description": "Invalid input",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "error": {"type": "string"}
                                    }
                                }
                            }
                        }
                    },
                    "500": {
                        "description": "Server error",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "error": {"type": "string"},
                                        "details": {"type": "string"}
                                    }
                                }
                            }
                        }
                    }
                },
                "security": [
                    {"apiKey": []}
                ]
            }
        }
        
        # Add schema components
        request_schema_name = f"{api_name}Request"
        response_schema_name = f"{api_name}Response"
        swagger_spec["components"]["schemas"][request_schema_name] = request_schema
        swagger_spec["components"]["schemas"][response_schema_name] = response_schema
    
    return swagger_spec


def parse_date_string(date_str: str) -> Optional[datetime.datetime]:
    """
    Parse date string in common formats.
    
    Args:
        date_str: Date string to parse
        
    Returns:
        Parsed datetime object or None if parsing fails
    """
    formats = [
        '%Y-%m-%d',         # 2023-01-31
        '%d/%m/%Y',         # 31/01/2023
        '%m/%d/%Y',         # 01/31/2023
        '%Y-%m-%dT%H:%M:%S',# 2023-01-31T14:30:00
        '%Y-%m-%d %H:%M:%S' # 2023-01-31 14:30:00
    ]
    
    for fmt in formats:
        try:
            return datetime.datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    
    return None


def api_cache_control(max_age: int = 3600):
    """
    Decorator to add cache control headers to API responses.
    
    Args:
        max_age: Maximum age in seconds for cache
        
    Returns:
        Decorated function
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            response = f(*args, **kwargs)
            
            if isinstance(response, Response):
                response.headers['Cache-Control'] = f'public, max-age={max_age}'
                return response
            elif isinstance(response, tuple) and len(response) >= 1:
                if isinstance(response[0], Response):
                    response[0].headers['Cache-Control'] = f'public, max-age={max_age}'
                    return response
            
            return response
        return decorated_function
    return decorator


def api_rate_limit(limits: Dict[str, int], time_frame: int = 60):
    """
    Decorator to implement rate limiting for API endpoints.
    This is a simplified version and would require a proper storage backend for production.
    
    Args:
        limits: Dictionary of rate limits by role (e.g. {"user": 100, "admin": 1000})
        time_frame: Time frame in seconds
        
    Returns:
        Decorated function
    """
    # Simplified in-memory storage - would use Redis or similar in production
    request_counts = {}
    
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get client identifier (IP or API key)
            client_id = request.headers.get('X-API-KEY', request.remote_addr)
            
            # Get role (simplified - would use auth system in production)
            role = request.headers.get('X-USER-ROLE', 'user')
            
            # Get rate limit for this role
            rate_limit = limits.get(role, limits.get('user', 100))
            
            # Check if client has exceeded rate limit
            now = datetime.datetime.now().timestamp()
            client_key = f"{client_id}:{int(now / time_frame)}"
            
            if client_key in request_counts:
                if request_counts[client_key] >= rate_limit:
                    return jsonify({
                        "error": "Rate limit exceeded",
                        "retry_after": time_frame - (int(now) % time_frame)
                    }), 429
                
                request_counts[client_key] += 1
            else:
                # Clean up old entries
                for key in list(request_counts.keys()):
                    if not key.startswith(f"{client_id}:"):
                        continue
                    key_timestamp = int(key.split(':')[1]) * time_frame
                    if now - key_timestamp > time_frame:
                        del request_counts[key]
                
                request_counts[client_key] = 1
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator 