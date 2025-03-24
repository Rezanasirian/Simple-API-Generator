import json
from typing import Dict, List, Optional, Any
from pathlib import Path
from app.services.logger import setup_logging

logger = setup_logging(__name__)


class APIQueryBuilder:
    def __init__(self, template_path: str):
        """
        Initialize the API Query Builder.

        Args:
            template_path (str): Path to the API configuration JSON file
        """
        self.template_path = Path(template_path)
        if not self.template_path.exists():
            raise FileNotFoundError(f"API configuration file not found: {template_path}")

    def _load_json(self) -> Dict[str, Any]:
        """
        Load and parse the JSON configuration file.

        Returns:
            Dict[str, Any]: Parsed JSON configuration

        Raises:
            json.JSONDecodeError: If the JSON file is invalid
            IOError: If there's an error reading the file
        """
        try:
            with open(self.template_path, 'r', encoding='utf-8') as file:
                return json.load(file)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in configuration file: {e}")
            raise
        except IOError as e:
            logger.error(f"Error reading configuration file: {e}")
            raise

    def _save_json(self, data: Dict[str, Any]) -> None:
        """
        Save the configuration data to JSON file.

        Args:
            data (Dict[str, Any]): Configuration data to save

        Raises:
            IOError: If there's an error writing to the file
        """
        try:
            with open(self.template_path, 'w', encoding='utf-8') as file:
                json.dump(data, file, indent=4)
        except IOError as e:
            logger.error(f"Error saving configuration file: {e}")
            raise

    def update_condition(self, api_name: str, parameter_key: str, updates: Dict[str, Any]) -> None:
        """
        Update or add a condition for an API.

        Args:
            api_name (str): Name of the API
            parameter_key (str): Key of the parameter to update
            updates (Dict[str, Any]): Updates to apply to the condition
        """
        all_apis = self._load_json()

        if api_name not in all_apis:
            logger.error(f"API not found: {api_name}")
            raise KeyError(f"API not found: {api_name}")

        if "Conditions" not in all_apis[api_name]:
            all_apis[api_name]["Conditions"] = []

        conditions = all_apis[api_name]["Conditions"]
        condition_updated = False

        # Iterate over conditions
        for condition in conditions:
            if isinstance(condition, dict):
                for key in condition.keys():
                    if key == parameter_key:
                        condition[key] = self.deep_update(condition[key], updates)
                        condition_updated = True
                        break

        # If no existing condition is found, add a new one
        if not condition_updated:
            all_apis[api_name]["Conditions"].append({parameter_key: updates})

        self._save_json(all_apis)
        logger.info(f"Updated condition for API {api_name}, parameter {parameter_key}")

    def deep_update(self, original: Dict[str, Any], updates: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively update dictionary values."""
        for key, value in updates.items():
            if isinstance(value, dict) and key in original and isinstance(original[key], dict):
                original[key] = self.deep_update(original[key], value)
            else:
                original[key] = value
        return original

    def delete_condition(self,api_name:str,parameter_key:str) -> None:
        """
        Delete a condition for an API.
        :param api_name: Name of the API
        :param parameter_key:  parameter_key of the condition
        """
        all_apis = self._load_json()
        if api_name not in all_apis:
            logger.error(f"API not found: {api_name}")
            raise KeyError(f"API not found: {api_name}")

        conditions = all_apis[api_name]["Conditions"]
        for condition in conditions:
            if isinstance(condition, dict):
                for key in condition.keys():
                    if key == parameter_key:
                        conditions.remove(condition)

        self._save_json(all_apis)
        logger.info(f"Delete condition for API {api_name}, parameter {parameter_key}")

    def update_api(self, api_name: str, updates: Dict[str, Any]) -> None:
        """
        Update API configuration.

        Args:
            api_name (str): Name of the API to update
            updates (Dict[str, Any]): Updates to apply to the API configuration
        """
        all_apis = self._load_json()

        if api_name not in all_apis:
            logger.error(f"API not found: {api_name}")
            raise KeyError(f"API not found: {api_name}")

        all_apis[api_name].update(updates)
        self._save_json(all_apis)
        logger.info(f"Updated API configuration for {api_name}")

    def build_api_service(self, api_name: str) -> str:
        """
        Build SQL query for an API.

        Args:
            api_name (str): Name of the API

        Returns:
            str: Constructed SQL query

        Raises:
            KeyError: If API or required fields are not found
        """
        all_apis = self._load_json()
        api_config = all_apis.get(api_name)

        if not api_config:
            raise KeyError(f"API not found: {api_name}")

        table_name = api_config.get('TableName')
        if not table_name:
            raise KeyError(f"TableName not found for API: {api_name}")

        base_query = f"SELECT * FROM HIVE.AGRIDW.{table_name}"
        condition_parts = []

        for param, cond in api_config.get('Conditions', {}).items():
            if 'ignoreIf' not in cond or param != cond['ignoreIf']:
                sql_part = self._build_condition_sql(param, cond)
                condition_parts.append(sql_part)

        condition_query = " WHERE " + " AND ".join(condition_parts) if condition_parts else ""
        order_by = self._build_order_by(api_config)
        full_query = base_query + condition_query + order_by

        logger.info(f"Built query for API {api_name}")
        return full_query

    def _build_condition_sql(self, param: str, cond: Dict[str, Any]) -> str:
        """Build SQL condition part with transformations."""
        column = cond['Column']
        operator = cond['operator']

        if 'transformations' in cond:
            column = self._apply_transformations(column, cond['transformations'])

        return f"{column} {operator} {param}"

    def _apply_transformations(self, column: str, transformations: Dict[str, Any]) -> str:
        """Apply SQL transformations to a column."""
        expression = column

        if 'cast' in transformations:
            expression = f"cast({expression} as {transformations['cast']})"
        if 'substring' in transformations:
            start, length = transformations['substring']
            expression = f"substring({expression}, {start}, {length})"
        if transformations.get('trim'):
            expression = f"trim({expression})"
        if 'replace' in transformations:
            old, new = transformations['replace']
            expression = f"replace({expression}, '{old}', '{new}')"

        return expression

    def _build_order_by(self, api_config: Dict[str, Any]) -> str:
        """Build ORDER BY clause."""
        order_by = api_config.get('OrderBy')
        order_type = api_config.get('OrderType', '')

        if not order_by:
            return ""

        return f" ORDER BY {order_by} {order_type}"

    def add_api(self, api_name: str, api_details: Dict[str, Any]) -> None:
        """
        Add a new API configuration.

        Args:
            api_name (str): Name of the new API
            api_details (Dict[str, Any]): API configuration details
        """
        all_apis = self._load_json()

        if api_name in all_apis:
            logger.warning(f"API {api_name} already exists, overwriting configuration")

        all_apis[api_name] = api_details
        self._save_json(all_apis)
        logger.info(f"Added new API: {api_name}")

    def get_api_prop(self, api_name: str) -> Dict[str, Any]:
        """
        Get API configuration properties.

        Args:
            api_name (str): Name of the API

        Returns:
            Dict[str, Any]: API configuration
        """
        all_apis = self._load_json()
        return all_apis.get(api_name, {})

    def API_list(self) -> List[str]:
        """
        Get list of all API names.

        Returns:
            List[str]: List of API names
        """
        all_apis = self._load_json()
        return list(all_apis.keys())
