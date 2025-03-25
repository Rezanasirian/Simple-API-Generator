import json
from typing import Dict, Any, Union, Optional
from pathlib import Path
from app.services.connection_configs import DatabaseType

class QueryConstructor:
    def __init__(self, config_path: str = 'config/ApiDoc.json'):
        self.config_path = Path(config_path)


    def _load_api_config(self, api_name: str) -> Dict[str, Any]:
        """Load API configuration from JSON file."""

        with open(self.config_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
            if api_name not in data:
                raise ValueError(f"API '{api_name}' not found in configuration")
            return data[api_name]
            
    def construct_query(self, api_name: str, parameters: Dict[str, Any], offset: int = 0, limit: int = 100, 
                        order_by: Optional[str] = None, order_direction: str = 'ASC') -> Union[str, Dict[str, Any]]:
        """
        Construct query based on API configuration and database type.
        
        Args:
            api_name: Name of the API
            parameters: Request parameters
            offset: Pagination offset
            limit: Pagination limit
            order_by: Field to order by
            order_direction: Direction to order (ASC or DESC)
            
        Returns:
            Query string or MongoDB query object
        """
        
        api_config = self._load_api_config(api_name)
        db_config = api_config.get('database', {})
        db_type = db_config.get('type', 'trino')
        
        # Use configuration defaults if not provided
        if order_by is None:
            ordering = api_config.get('ordering', {})
            order_by = ordering.get('default_field')
            
        if order_by is None:
            order_by = api_config.get('OrderBy')
            
        if order_direction is None:
            ordering = api_config.get('ordering', {})
            order_direction = ordering.get('default_direction', 'ASC')
            if order_direction is None:
                order_direction = api_config.get('OrderType', 'ASC')
        
        if db_type == DatabaseType.TRINO.value:
            return self._construct_trino_query(api_config, parameters, offset, limit, order_by, order_direction)
        elif db_type == DatabaseType.MYSQL.value:
            return self._construct_mysql_query(api_config, parameters, offset, limit, order_by, order_direction)
        elif db_type == DatabaseType.MONGODB.value:
            return self._construct_mongo_query(api_config, parameters, order_by, order_direction)
        else:
            raise ValueError(f"Unsupported database type: {db_type}")
            
    def _construct_trino_query(self, api_config: Dict[str, Any], parameters: Dict[str, Any], 
                              offset: int, limit: int, order_by: Optional[str], order_direction: str) -> str:
        """Construct Trino SQL query."""
        db_config = api_config['database']
        
        # Determine fields to select
        response_config = api_config.get('response', {})
        fields = response_config.get('fields', [])
        
        if fields:
            field_list = ", ".join(fields)
            base_query = f"SELECT {field_list} FROM {db_config.get('catalog', '')}.{db_config.get('schema', '')}.{db_config['table']}"
        else:
            base_query = f"SELECT * FROM {db_config.get('catalog', '')}.{db_config.get('schema', '')}.{db_config['table']}"
        
        # Add conditions
        condition_parts = []
        for condition_group in api_config.get('Conditions', []):
            for param_name, condition_config in condition_group.items():
                if param_name in parameters:
                    param_value = parameters[param_name]
                    
                    # Skip if parameter should be ignored
                    if param_value == condition_config.get('IgnoreIf'):
                        continue
                    
                    column = condition_config.get('Column')
                    operator = condition_config.get('Operator')
                    
                    # Apply transformations to column if specified
                    if 'transformations' in condition_config and condition_config['transformations']:
                        column = self._apply_transformations(column, condition_config['transformations'])
                    
                    # Format the value based on operator and data type
                    formatted_value = self._format_value(param_value, operator, condition_config.get('data_type'))
                    
                    condition_parts.append(f"{column} {operator} {formatted_value}")
                
        # Add WHERE clause if conditions exist
        if condition_parts:
            base_query += " WHERE " + " AND ".join(condition_parts)
            
        # Add ORDER BY
        if order_by:
            base_query += f" ORDER BY {order_by} {order_direction}"
            
        # Add pagination
        base_query += f" OFFSET {offset} ROWS FETCH NEXT {limit} ROWS ONLY"
        
        return base_query
        
    def _construct_mysql_query(self, api_config: Dict[str, Any], parameters: Dict[str, Any], 
                              offset: int, limit: int, order_by: Optional[str], order_direction: str) -> str:
        """Construct MySQL query."""
        db_config = api_config['database']
        
        # Determine fields to select
        response_config = api_config.get('response', {})
        fields = response_config.get('fields', [])
        
        if fields:
            field_list = ", ".join(fields)
            base_query = f"SELECT {field_list} FROM {db_config['name']}.{db_config['table']}"
        else:
            base_query = f"SELECT * FROM {db_config['name']}.{db_config['table']}"
        
        # Add conditions
        condition_parts = []
        for condition_group in api_config.get('Conditions', []):
            for param_name, condition_config in condition_group.items():
                if param_name in parameters:
                    param_value = parameters[param_name]
                    
                    # Skip if parameter should be ignored
                    if param_value == condition_config.get('IgnoreIf'):
                        continue
                    
                    column = condition_config.get('Column')
                    operator = condition_config.get('Operator')
                    
                    # Apply transformations to column if specified
                    if 'transformations' in condition_config and condition_config['transformations']:
                        column = self._apply_transformations(column, condition_config['transformations'])
                    
                    # Format the value based on operator and data type
                    formatted_value = self._format_value(param_value, operator, condition_config.get('data_type'))
                    
                    condition_parts.append(f"{column} {operator} {formatted_value}")
                
        # Add WHERE clause if conditions exist
        if condition_parts:
            base_query += " WHERE " + " AND ".join(condition_parts)
            
        # Add ORDER BY
        if order_by:
            base_query += f" ORDER BY {order_by} {order_direction}"
            
        # Add pagination
        base_query += f" LIMIT {limit} OFFSET {offset}"
        
        return base_query
        
    def _construct_mongo_query(self, api_config: Dict[str, Any], parameters: Dict[str, Any], 
                             order_by: Optional[str] = None, order_direction: str = 'ASC') -> Dict[str, Any]:
        """
        Construct MongoDB query.
        
        Args:
            api_config: API configuration
            parameters: Request parameters
            order_by: Optional field to sort by
            order_direction: Sorting direction ('ASC' or 'DESC')
            
        Returns:
            MongoDB query object
        """
        query = {}
        
        # Build the filter criteria
        for condition_group in api_config.get('conditions', []):
            if condition_group.get('parameter') in parameters:
                param_value = parameters[condition_group.get('parameter')]

                # Skip if parameter should be ignored
                # if param_value == condition_config.get('IgnoreIf'):
                #     continue

                column = condition_group.get('column')
                operator = condition_group.get('operator')

                # Convert SQL operator to MongoDB operator and add to query
                mongo_operator = self._sql_to_mongo_operator(operator)
                query[column] = {mongo_operator: param_value}

        return query
        
    def _build_condition(self, api_config: Dict[str, Any], param_name: str, param_value: Any) -> str:
        """
        Build SQL condition based on configuration.
        
        Args:
            api_config: API configuration
            param_name: Parameter name
            param_value: Parameter value
            
        Returns:
            SQL condition string
        """
        for condition_group in api_config.get('Conditions', []):
            if param_name in condition_group:
                condition = condition_group[param_name]
                
                # Skip if value matches ignoreIf
                if param_value == condition.get('IgnoreIf'):
                    return ""
                    
                column = condition['Column']
                operator = condition['Operator']
                
                # Apply transformations
                if 'transformations' in condition and condition['transformations']:
                    column = self._apply_transformations(column, condition['transformations'])
                    
                # Format value based on operator and data type
                formatted_value = self._format_value(param_value, operator, condition.get('data_type'))
                
                return f"{column} {operator} {formatted_value}"
                
        return ""
                
    def _apply_transformations(self, column: str, transformations: Dict[str, Any]) -> str:
        """
        Apply SQL transformations to column.
        
        Args:
            column: Column name or expression
            transformations: Transformation configuration
            
        Returns:
            Transformed column expression
        """
        expression = column
        
        # Apply CAST transformation
        if 'cast' in transformations:
            expression = f"CAST({expression} AS {transformations['cast']})"
            
        # Apply SUBSTRING transformation
        if 'substring' in transformations:
            if isinstance(transformations['substring'], list) and len(transformations['substring']) >= 2:
                start = transformations['substring'][0]
                length = transformations['substring'][1]
                expression = f"SUBSTRING({expression}, {start}, {length})"
                
        # Apply TRIM transformation
        if transformations.get('trim'):
            expression = f"TRIM({expression})"
                
        # Apply REPLACE transformation
        if 'replace' in transformations:
            if isinstance(transformations['replace'], list) and len(transformations['replace']) >= 2:
                old_val = transformations['replace'][0]
                new_val = transformations['replace'][1]
                
                if old_val is not None:
                    old_str = f"'{old_val}'"
                else:
                    old_str = "NULL"
                    
                if new_val is not None:
                    new_str = f"'{new_val}'"
                else:
                    new_str = "NULL"
                
                expression = f"REPLACE({expression}, {old_str}, {new_str})"
                
        # Apply custom SQL command if specified
        if 'sqlCommand' in transformations:
            expression = f"{expression} {transformations['sqlCommand']}"
                
        return expression
            
    def _format_value(self, value: Any, operator: str, data_type: Optional[str] = None) -> str:
        """
        Format a value for use in a SQL query based on operator and data type.
        
        Args:
            value: Value to format
            operator: SQL operator
            data_type: Optional data type
            
        Returns:
            Formatted value string
        """
        # Handle NULL values
        if value is None:
            return "NULL"
            
        # Handle operators that don't need quotes
        if operator.upper() in ['IS', 'IS NOT']:
            if isinstance(value, str) and value.upper() == 'NULL':
                return "NULL"
            elif value is None:
                return "NULL"
            else:
                return str(value)
                
        # Handle list operators
        if operator.upper() in ['IN', 'NOT IN']:
            if isinstance(value, list):
                # Format each value in the list
                formatted_items = []
                for item in value:
                    if isinstance(item, str):
                        formatted_items.append(f"'{item}'")
                    else:
                        formatted_items.append(str(item))
                return f"({', '.join(formatted_items)})"
            else:
                # Single value treated as a list with one item
                if isinstance(value, str):
                    return f"('{value}')"
                else:
                    return f"({value})"
                    
        # Format based on data type
        if data_type == 'string' or isinstance(value, str):
            # Escape single quotes
            escaped_value = str(value).replace("'", "''")
            return f"'{escaped_value}'"
        else:
            return str(value)
            
    def _sql_to_mongo_operator(self, sql_operator: str) -> str:
        """
        Convert SQL operator to MongoDB operator.
        
        Args:
            sql_operator: SQL operator string
            
        Returns:
            MongoDB operator string
        """
        operator_map = {
            '=': '$eq',
            '<>': '$ne',
            '!=': '$ne',
            '>': '$gt',
            '>=': '$gte',
            '<': '$lt',
            '<=': '$lte',
            'LIKE': '$regex',
            'IN': '$in',
            'NOT IN': '$nin'
        }
        
        return operator_map.get(sql_operator.upper(), '$eq')


# Singleton instance
query_constructor = QueryConstructor()

def construct_query(api_name: str, parameters: Dict[str, Any], offset: int = 0, limit: int = 100,
                   order_by: Optional[str] = None, order_direction: str = 'ASC') -> Union[str, Dict[str, Any]]:
    """
    Construct a query for the given API.
    
    Args:
        api_name: Name of the API
        parameters: Request parameters
        offset: Pagination offset
        limit: Pagination limit
        order_by: Field to order by
        order_direction: Direction to order (ASC or DESC)
        
    Returns:
        Query string or MongoDB query object
    """
    return query_constructor.construct_query(
        api_name=api_name,
        parameters=parameters,
        offset=offset,
        limit=limit,
        order_by=order_by,
        order_direction=order_direction
    )
