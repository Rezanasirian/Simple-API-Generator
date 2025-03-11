import json
from typing import Dict, Any, Union
from pathlib import Path
from services.connection_configs import DatabaseType


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

    def construct_query(self, api_name: str, parameters: Dict[str, Any], offset: int = 0, limit: int = 100) -> Union[
        str, Dict[str, Any]]:
        """Construct query based on API configuration and database type."""

        api_config = self._load_api_config(api_name)
        db_config = api_config.get('database', {})
        db_type = db_config.get('type', 'trino')

        if db_type == DatabaseType.TRINO.value:
            return self._construct_trino_query(api_config, parameters, offset, limit)
        elif db_type == DatabaseType.MYSQL.value:
            return self._construct_mysql_query(api_config, parameters, offset, limit)
        elif db_type == DatabaseType.MONGODB.value:
            return self._construct_mongo_query(api_config, parameters)
        else:
            raise ValueError(f"Unsupported database type: {db_type}")

    def _construct_trino_query(self, api_config: Dict[str, Any], parameters: Dict[str, Any], offset: int,
                               limit: int) -> str:
        """Construct Trino SQL query."""
        db_config = api_config['database']
        base_query = f"SELECT * FROM {db_config['catalog']}.{db_config['schema']}.{db_config['table']}"

        # Add conditions
        condition_parts = []
        for param_name, param_value in parameters.items():
            condition = self._build_condition(api_config, param_name, param_value)
            if condition:
                condition_parts.append(condition)

        # Add WHERE clause if conditions exist
        if condition_parts:
            base_query += " WHERE " + " AND ".join(condition_parts)

        # Add ORDER BY
        if 'OrderBy' in api_config:
            base_query += f" ORDER BY {api_config['OrderBy']} {api_config.get('OrderType', 'ASC')}"

        # Add pagination
        base_query += f" OFFSET {offset} ROWS FETCH NEXT {limit} ROWS ONLY"

        return base_query

    def _construct_mysql_query(self, api_config: Dict[str, Any], parameters: Dict[str, Any], offset: int,
                               limit: int) -> str:
        """Construct MySQL query."""
        db_config = api_config['database']
        base_query = f"SELECT * FROM {db_config['database']}.{db_config['table']}"

        # Add conditions
        condition_parts = []
        for param_name, param_value in parameters.items():
            condition = self._build_condition(api_config, param_name, param_value)
            if condition:
                condition_parts.append(condition)

        # Add WHERE clause if conditions exist
        if condition_parts:
            base_query += " WHERE " + " AND ".join(condition_parts)

        # Add ORDER BY
        if 'OrderBy' in api_config:
            base_query += f" ORDER BY {api_config['OrderBy']} {api_config.get('OrderType', 'ASC')}"

        # Add pagination
        base_query += f" LIMIT {limit} OFFSET {offset}"

        return base_query

    def _construct_mongo_query(self, api_config: Dict[str, Any], parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Construct MongoDB query."""
        query = {}

        # Convert SQL-like conditions to MongoDB query format
        for param_name, param_value in parameters.items():
            mongo_condition = self._build_mongo_condition(api_config, param_name, param_value)
            if mongo_condition:
                query.update(mongo_condition)

        return query

    def _build_condition(self, api_config: Dict[str, Any], param_name: str, param_value: Any) -> str:
        """Build SQL condition based on configuration."""
        conditions = api_config.get('Conditions', [])
        for condition_group in conditions:
            if param_name in condition_group:
                condition = condition_group[param_name]

                # Skip if value matches ignoreIf
                if param_value == condition.get('IgnoreIf'):
                    continue

                column = condition['Column']
                operator = condition['Operator']

                # Apply transformations
                if 'transformations' in condition:
                    column = self._apply_transformations(column, condition['transformations'])

                # Format value based on operator
                formatted_value = self._format_value(param_value, operator)

                return f"{column} {operator} {formatted_value}"

        return ""

    def _build_mongo_condition(self, api_config: Dict[str, Any], param_name: str, param_value: Any) -> Dict[str, Any]:
        """Build MongoDB condition based on configuration."""
        conditions = api_config.get('Conditions', [])
        for condition_group in conditions:
            if param_name in condition_group:
                condition = condition_group[param_name]

                # Skip if value matches ignoreIf
                if param_value == condition.get('IgnoreIf'):
                    continue

                column = condition['Column']
                operator = condition['Operator']

                # Convert SQL operator to MongoDB operator
                mongo_operator = self._sql_to_mongo_operator(operator)
                return {column: {mongo_operator: param_value}}

        return {}

    def _apply_transformations(self, column: str, transformations: Dict[str, Any]) -> str:
        """Apply SQL transformations to column."""
        expression = column

        if 'cast' in transformations:
            expression = f"CAST({expression} AS {transformations['cast']})"

        if 'substring' in transformations:
            start, length = transformations['substring']
            expression = f"SUBSTRING({expression}, {start}, {length})"

        if transformations.get('trim'):
            expression = f"TRIM({expression})"

        if 'replace' in transformations:
            old, new = transformations['replace']
            expression = f"REPLACE({expression}, '{old}', '{new}')"

        return expression

    def _format_value(self, value: Any, operator: str) -> str:
        """Format value based on operator."""
        if operator.lower() == 'in':
            if isinstance(value, (list, tuple)):
                return f"({','.join(repr(v) for v in value)})"
            return f"({value})"
        elif isinstance(value, str):
            return f"'{value}'"
        return str(value)

    def _sql_to_mongo_operator(self, sql_operator: str) -> str:
        """Convert SQL operator to MongoDB operator."""
        operators = {
            '=': '$eq',
            '!=': '$ne',
            '>': '$gt',
            '>=': '$gte',
            '<': '$lt',
            '<=': '$lte',
            'in': '$in',
            'not in': '$nin',
            'like': '$regex'
        }
        return operators.get(sql_operator.lower(), '$eq')


# Create global query constructor instance
query_constructor = QueryConstructor()


# Backwards compatibility
def construct_query(api_name: str, parameters: Dict[str, Any], offset: int = 0, limit: int = 100) -> Union[
    str, Dict[str, Any]]:
    """Backwards compatible query construction."""
    return query_constructor.construct_query(api_name, parameters, offset, limit)
