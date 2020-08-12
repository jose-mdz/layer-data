import {SchemaOf, SchemaValidator} from "layer-validation";

export type DataColumnType =
    'BOOLEAN'   |
    'VARCHAR'   |
    'TEXT'      |
    'INTEGER'   |
    'FLOAT'     |
    'DATE'      |
    'DATETIME';

export interface DataColumnDefinition{
    name: string;
    type: DataColumnType;
    primaryKey?: boolean;       // Default is false
    size?: number;              // Default is driver specific
    notNull?: boolean;          // Default is false,
    isAutoIncrement?: boolean   // Default is false
}

export interface DataTableDefinition {
    name: string;
    columns: DataColumnDefinition[];
}

export interface DataRecordPersist {
    table: string;
    columns: string[];
    values: any[];
    records?: number; // Default 1. If more than one, values will be assumed to be an array of values per record.
    keys?: {[key: string]: any};
}

export interface PreparedStatement {
    sql: string;
    values: any[];
}

export interface EntityMapper<T>{
    table: string;
    primaryKey: string;
    autoIncrement?: string;
}

export function createRecordPersist<T>(data: T, schema: SchemaOf<T>, mapper: EntityMapper<T>): DataRecordPersist {

    const table = mapper.table;
    const records = 1;
    const columns: string[] = [];
    const values: string[] = [];
    const keys: any = {};

    keys[mapper.primaryKey] = (data as any)[mapper.primaryKey];

    for(let column in schema.properties){

        const isAutoIncrement = mapper.autoIncrement && mapper.autoIncrement.indexOf(column) >= 0;

        if(column in data && !isAutoIncrement) {
            const value = (data as any)[column];
            columns.push(column);
            values.push(value);
        }
    }

    return {table, columns, values, records, keys}
}

export function assignAutoIncrement<T>(id: any, data: T, mapper: EntityMapper<T>): T {

    const autoIncName = mapper.autoIncrement;

    if(autoIncName) {

        const idObject: any = {};
        idObject[autoIncName] = id;

        return Object.assign({}, data, idObject);
    }

    return data;

}

export function mapperToEntity<T>(original: any, schema: SchemaOf<T>): T{

    const validator = new SchemaValidator();
    const killList = [];
    const data = Object.assign({}, original);

    for(let name in data){

        const isRequired = schema.required && schema.required.indexOf(name) >= 0;
        const schemaType = schema.properties ? schema.properties[name].type || null : null;
        const canBeNull =  schemaType? schemaType === "null" || schemaType.indexOf('null') >= 0 : true;

        if(data[name] === null && !isRequired && !canBeNull) {
            killList.push(name);
        }
    }

    killList.forEach(name => delete data[name]);

    const valid = validator.isValid(data, schema);

    if(typeof valid === 'string') {
        throw `[DATA] object does not match schema: ${valid}`
    }

    return data as T;
}

export interface DataSource {

    readonly driverName: string;

    getClosestType(type: DataColumnType): string;

    createTable(table: DataTableDefinition): Promise<any>;

    getTableNames(): Promise<string[]>;

    insert<T>(data: any, schema: SchemaOf<T>, mapper: EntityMapper<T>): Promise<T>;

    update<T>(data: any, schema: SchemaOf<T>, mapper: EntityMapper<T>): Promise<void>;

    delete<T>(data: any, schema: SchemaOf<T>, mapper: EntityMapper<T>): Promise<void>;

    queryRun(query: string, params: object | any[]): Promise<any>;

    queriesRun(query: string): Promise<any>;

    queryData(query: string, params: object | any[]): Promise<any[]>;

    queryEntity<T>(mapper: SchemaOf<T>, query: string, params: object | any[]): Promise<T[]>
}

export function getMockDataSource(): DataSource{
    return {
        driverName: 'mockDataSource',
        getClosestType(type: DataColumnType): string {
            return type;
        },
        async createTable(table: DataTableDefinition): Promise<any> {
        },
        async getTableNames(): Promise<string[]> {
            return [];
        },
        async insert<T>(data: any, schema: SchemaOf<T>, mapper: EntityMapper<T>): Promise<T> {
            return data;
        },
        async update<T>(data: any, schema: SchemaOf<T>, mapper: EntityMapper<T>): Promise<void> {
        },
        async delete<T>(data: any, schema: SchemaOf<T>, mapper: EntityMapper<T>): Promise<void> {
        },
        async queryRun(query: string, params: object | any[]): Promise<any> {
        },
        async queriesRun(query: string): Promise<any> {
        },
        async queryData(query: string, params: object | any[]): Promise<any[]> {
            return [];
        },
        async queryEntity<T>(mapper: SchemaOf<T>, query: string, params: object | any[]): Promise<T[]> {
            return [];
        }
    }
}