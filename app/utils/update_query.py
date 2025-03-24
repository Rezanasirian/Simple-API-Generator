import json
def update_query(api_name, parameters):
    with open('/home/rezansrn/Api-Project/API/config/ApiDoc.json', 'r') as file:
        data = json.load(file)

        api_config = data.get(api_name, {})
        count_query = f"SELECT COUNT(*) AS count FROM HIVE.AGRIDW.{api_config['TableName']}"
        last_update_query = f"""
                SELECT (SELECT sdate FROM hive.agridw.vw_date WHERE mdate+1 = (
                    SELECT mdate FROM hive.agridw.vw_date WHERE SUBSTRING(CAST(miladidate AS VARCHAR(10)),3,8) = (
                    SELECT MAX(partitioned_date) FROM hive.agri.casv
                ))) AS MaxUpdateDate FROM HIVE.AGRIDW.{api_config['LastUpdateTableName']}
                """
        condition_strings = []
        conditions = api_config.get('conditions', {})
        for key, value in parameters.items():

            value = split_value(value)

            cond_config = api_config.get('conditions', {}).get(key)

            if cond_config and value != cond_config.get('Default'):
                cond_info = conditions[key]
                if 'cast' in cond_info:
                    value = f"cast({value} as {cond_info['cast']})"
            
                sql_part = f" {cond_info['Column']} {cond_info['operator'] } ({value}) "
                condition_strings.append(sql_part)
                
        if condition_strings:
            condition_query = " WHERE " + " AND ".join(condition_strings)
        else:
            condition_query = ""

        full_last_update_query = last_update_query + condition_query 
        return full_last_update_query,count_query   
    
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
