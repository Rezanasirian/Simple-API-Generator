def GenerateDictOfRows(c, r):
    result = []
    for row in r:
        row = dict(zip(c, row))
        result.append(row)
    return result
