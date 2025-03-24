def apply_transformations(column, transformations):
    expression = column
    for tran in transformations:
        if 'substring' in tran:
            start, length = tran['substring']
            expression = f"substring({expression}, {start}, {length})"
        elif 'cast' in tran:
            expression = f"cast({expression} as {tran['cast']})"
        elif tran.get('trim'):
            expression = f"trim({expression})"
        elif 'replace' in tran:
            old, new = tran['replace']
            expression = f"replace({expression}, '{old}', '{new}')"
    return expression