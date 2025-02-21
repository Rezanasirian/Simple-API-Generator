import json

class APIQueryBuilder:
    def __init__(self, template_path):
        self.template_path = template_path

    def _load_json(self):
        try:
            with open(self.template_path, 'r', encoding='utf-8') as file:
                return json.load(file)
        except Exception as e:
            print(f"Failed to load JSON: {e}")
            return {}

    def _save_json(self, data):
        try:
            with open(self.template_path, 'w', encoding='utf-8') as file:
                json.dump(data, file, indent=4)
        except Exception as e:
            print(f"Failed to save JSON: {e}")

    def update_condition(self, api_name, parameter_key, updates):
        all_apis = self._load_json()
        if api_name in all_apis and "conditions" in all_apis[api_name]:
            if parameter_key in all_apis[api_name]["conditions"]:
                all_apis[api_name]["conditions"][parameter_key].update(updates)
            else:
                all_apis[api_name]["conditions"][parameter_key] = updates
        self._save_json(all_apis)

    def update_api(self, api_name, updates):
        all_apis = self._load_json()
        if api_name in all_apis:
            all_apis[api_name].update(updates)
        self._save_json(all_apis)

    def build_api_service(self, api_name):
        all_apis = self._load_json()
        api_config = all_apis.get(api_name, {})
        base_query = f"SELECT * FROM HIVE.AGRIDW.{api_config.get('TableName', '')}"
        condition_parts = []

        for param, cond in api_config.get('conditions', {}).items():
            if 'ignoreIf' not in cond or param != cond['ignoreIf']:
                sql_part = f"{cond['Column']} {cond['operator']} "
                if 'cast' in cond:
                    sql_part += f"cast({param} as {cond['cast']})"
                else:
                    sql_part += param
                condition_parts.append(sql_part)

        condition_query = " WHERE " + " AND ".join(condition_parts) if condition_parts else ""
        order_by = f" ORDER BY {api_config.get('OrderBy', '')} {api_config.get('OrderType', '')}"
        full_query = base_query + condition_query + order_by
        return full_query

    def add_api(self, api_name, api_details):
        all_apis = self._load_json()
        all_apis[api_name] = api_details
        self._save_json(all_apis)

    def get_api_prop(self, api_name):
        all_apis = self._load_json()
        return all_apis.get(api_name, {})

    def API_list(self):
        Api_list = []
        all_apis = self._load_json()
        for ApiName, ApiDetail in all_apis.items():
            Api_list.append(ApiName)
        return Api_list
