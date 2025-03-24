import decimal
from bson.objectid import ObjectId

def newEncoder(o):
    if isinstance(o, ObjectId):
        return str(o)
    elif isinstance(o, decimal.Decimal):
        return float(o)
    else:
        return str(o)