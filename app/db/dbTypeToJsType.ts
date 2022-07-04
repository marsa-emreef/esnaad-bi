export function dbTypeToJsType(dbType: string) {
    console.log('We have dbType', dbType);
    return dataTypeMapper[dbType];
}

const dataTypeMapper: any = {
    Bit: 'boolean',
    TinyInt: 'number',
    SmallInt: 'number',
    Int: 'number',
    BigInt: 'string',
    Numeric: 'number',
    Decimal: 'number',
    SmallMoney: 'number',
    Money: 'number',
    Float: 'number',
    Real: 'number',
    SmallDateTime: 'date',
    DateTime: 'date',
    DateTime2: 'date',
    DateTimeOffset: 'date',
    Time: 'date',
    Date: 'date',
    Char: 'string',
    VarChar: 'string',
    Text: 'string',
    NChar: 'string',
    NVarChar: 'string',
    NText: 'string',
    Binary: 'buffer',
    VarBinary: 'buffer',
    Image: 'buffer',
    Null: 'null',
    TVP: 'object',
    UDT: 'buffer',
    UniqueIdentifier: 'string',
    Variant: 'any',
    xml: 'string'
}