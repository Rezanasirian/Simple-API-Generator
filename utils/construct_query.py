import json

def construct_query(api_name, parameters ,offset ,limit):
    with open('/home/rezansrn/Api-Project/API/config/ApiDoc.json', 'r') as file:
        data = json.load(file)

        api_config = data.get(api_name, {})
        base_query = f"SELECT * FROM HIVE.AGRIDW.{api_config['TableName']}"
        condition_strings = []
        conditions = api_config.get('conditions', {})
        
        for key, value in parameters.items():

            value = split_value(value)

            cond_config = api_config.get('conditions', {}).get(key)

            if cond_config and value != cond_config.get('ignoreIf'):
                cond_info = conditions[key]
                column = cond_config['Column']
                transformations = cond_config.get('transformations', {})
                sql_part = apply_transformations(column, value, transformations)
            
                sql_part = f" {sql_part} {cond_info['operator'] } ({value}) "
                condition_strings.append(sql_part)
                
        if condition_strings:
            condition_query = " WHERE " + " AND ".join(condition_strings)
        else:
            condition_query = ""
        order_by = f" ORDER BY {api_config['OrderBy']} {api_config['OrderType']}"

        pagination = f" OFFSET {(offset - 1) * limit} ROWS FETCH NEXT {limit} ROWS ONLY"

        full_query = base_query + condition_query + order_by + pagination
        return full_query   
    
def split_value(value):
    val = value.__str__()
    if isinstance(value,str) :
        valstr = ""
        cn=1
        for i in val.split(","):
            if cn==1 :
                valstr = "'" + i + "'"
            else:
                valstr += ",'" + i + "'"
            cn +=1
        val=valstr
    return val

def apply_transformations(column, value, transformations):
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
