# from flask import request, jsonify, g
# from app.services.logger import setup_logging
# from app.services.metrics_tracker import MetricsTracker
# from app.middleware.auth import api_key_required, track_user_activity
# from functools import wraps
# import time
# import json
# import traceback

# # Initialize logger
# logger = setup_logging()

# # Initialize metrics tracker
# metrics_tracker = MetricsTracker()

# # Error handling decorator
# def handle_errors(f):
#     @wraps(f)
#     def decorated_function(*args, **kwargs):
#         try:
#             # Track API call
#             api_id = kwargs.get('api_id', 'unknown')
#             g.metrics_tracking = metrics_tracker.track_api_call(
#                 api_id=api_id,
#                 user_id=getattr(g, 'metrics_user_id', None)
#             )
            
#             # Set start time for performance tracking
#             start_time = time.time()
            
#             # Call the original function
#             result = f(*args, **kwargs)
            
#             # Track successful API call
#             metrics_tracker.complete_api_call(g.metrics_tracking, success=True)
            
#             # Log the request and time taken
#             logger.info(f"API {api_id} call successful - Time: {time.time() - start_time:.3f}s")
            
#             return result
#         except Exception as e:
#             # Track failed API call
#             if hasattr(g, 'metrics_tracking'):
#                 metrics_tracker.complete_api_call(
#                     g.metrics_tracking,
#                     success=False,
#                     error=str(e)
#                 )
            
#             # Log the error
#             logger.error(f"Error in API call: {str(e)}")
#             logger.error(traceback.format_exc())
            
#             # Return error response
#             return jsonify({
#                 'success': False,
#                 'error': str(e),
#                 'error_type': type(e).__name__
#             }), 500
#     return decorated_function

# # API Generator function
# @api_key_required
# @track_user_activity
# @handle_errors
# def generate_api_response(api_id, config, query_constructor):
#     """
#     Generate API response based on configured API_id and request parameters
#     """
#     # Log API request
#     logger.info(f"API Request: {api_id}")
    
#     # Validate inputs
#     validate_request(api_id, config)
    
#     # Get request parameters
#     params = request.args.to_dict()
    
#     # Process pagination
#     page_size, page = process_pagination(params, config)
    
#     # Get ordering parameters
#     order_by, order_direction = process_ordering(params, config)
    
#     # Construct and execute query
#     query_result = execute_query(api_id, config, query_constructor, params, page_size, page, order_by, order_direction)
    
#     # Format response
#     response = format_response(api_id, config, query_result, page_size, page)
    
#     return response

# def validate_request(api_id, config):
#     """Validate the API request parameters"""
#     if not config:
#         logger.error(f"API configuration not found for {api_id}")
#         raise ValueError(f"API configuration not found: {api_id}")
    
#     # Get required parameters from config
#     required_params = []
#     for condition in config.get('conditions', []):
#         if condition.get('required', False):
#             required_params.append(condition.get('parameter'))
    
#     # Check for required parameters
#     for param in required_params:
#         if param not in request.args:
#             logger.warning(f"Missing required parameter: {param}")
#             raise ValueError(f"Missing required parameter: {param}")

# def process_pagination(params, config):
#     """Process pagination parameters"""
#     # Check if pagination is enabled
#     pagination_config = config.get('pagination', {})
#     pagination_enabled = pagination_config.get('enabled', False)
    
#     # Get default values
#     default_limit = pagination_config.get('default_limit', 100)
#     max_limit = pagination_config.get('max_limit', 1000)
    
#     # Get pagination parameters from request
#     try:
#         page_size = int(params.get('limit', default_limit))
#         page = int(params.get('page', 1))
#     except ValueError:
#         logger.warning("Invalid pagination parameters")
#         raise ValueError("Invalid pagination parameters: limit and page must be integers")
    
#     # Validate pagination parameters
#     if page_size > max_limit:
#         page_size = max_limit
    
#     if page < 1:
#         page = 1
    
#     return page_size, page

# def process_ordering(params, config):
#     """Process ordering parameters"""
#     # Get ordering configuration
#     ordering_config = config.get('ordering', {})
    
#     # Default order values
#     default_field = ordering_config.get('default_field')
#     default_direction = ordering_config.get('default_direction', 'ASC')
    
#     # Get ordering parameters from request
#     order_by = params.get('order_by', default_field)
#     order_direction = params.get('order_direction', default_direction).upper()
    
#     # Validate order direction
#     if order_direction not in ['ASC', 'DESC']:
#         order_direction = default_direction
    
#     return order_by, order_direction

# def execute_query(api_id, config, query_constructor, params, page_size, page, order_by, order_direction):
#     """Construct and execute the database query"""
#     result = query_constructor.construct_query(
#         api_id=api_id,
#         parameters=params,
#         page_size=page_size,
#         page=page,
#         order_by=order_by,
#         order_direction=order_direction
#     )
    
#     return result

# def format_response(api_id, config, query_result, page_size, page):
#     """Format the API response based on configuration"""
#     # Process transformations
#     apply_transformations(config, query_result)
    
#     # Construct response
#     response = {
#         'success': True,
#         'api_id': api_id,
#         'data': query_result.get('data', []),
#         'metadata': {
#             'total_records': query_result.get('total_count', 0),
#             'page': page,
#             'page_size': page_size
#         }
#     }
    
#     # Add timing information if available
#     if 'query_time' in query_result:
#         response['metadata']['query_time'] = query_result['query_time']
    
#     # Check for cache information
#     cache_config = config.get('cache', {})
#     if cache_config.get('enabled', False):
#         response['metadata']['cached'] = query_result.get('cached', False)
#         response['metadata']['cache_ttl'] = cache_config.get('ttl', 60)
    
#     return jsonify(response)

# def apply_transformations(config, query_result):
#     """Apply transformations to the query result based on configuration"""
#     transformations = config.get('transformations', [])
    
#     if not transformations:
#         return
    
#     # Apply transformations to each record
#     for record in query_result.get('data', []):
#         for transform in transformations:
#             source = transform.get('source')
#             target = transform.get('target')
#             transform_type = transform.get('type')
            
#             if not all([source, target, transform_type]) or source not in record:
#                 continue
            
#             source_value = record[source]
            
#             # Apply transformation based on type
#             if transform_type == 'format_date':
#                 # Format date fields
#                 from datetime import datetime
#                 try:
#                     if isinstance(source_value, str):
#                         dt = datetime.fromisoformat(source_value.replace('Z', '+00:00'))
#                         record[target] = dt.strftime(transform.get('format', '%Y-%m-%d %H:%M:%S'))
#                     else:
#                         record[target] = source_value
#                 except Exception:
#                     record[target] = source_value
                    
#             elif transform_type == 'format_number':
#                 # Format number fields
#                 try:
#                     precision = transform.get('precision', 2)
#                     record[target] = round(float(source_value), precision)
#                 except Exception:
#                     record[target] = source_value
                    
#             elif transform_type == 'map':
#                 # Map values
#                 mapping = transform.get('mapping', {})
#                 record[target] = mapping.get(str(source_value), source_value)
                
#             elif transform_type == 'concat':
#                 # Concatenate fields
#                 fields = transform.get('fields', [])
#                 separator = transform.get('separator', ' ')
                
#                 values = []
#                 for field in fields:
#                     if field in record:
#                         values.append(str(record[field]))
                
#                 record[target] = separator.join(values)
                
#             elif transform_type == 'custom':
#                 # Custom transformation - not implemented here for security reasons
#                 record[target] = source_value 