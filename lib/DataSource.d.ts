import { SchemaOf } from "layer-validation";
export declare type DataColumnType = 'BOOLEAN' | 'VARCHAR' | 'TEXT' | 'INTEGER' | 'FLOAT' | 'DATE' | 'DATETIME';
export interface DataColumnDefinition {
    name: string;
    type: DataColumnType;
    primaryKey?: boolean;
    size?: number;
    notNull?: boolean;
    isAutoIncrement?: boolean;
}
export interface DataTableDefinition {
    name: string;
    columns: DataColumnDefinition[];
}
export interface DataRecordPersist {
    table: string;
    columns: string[];
    values: any[];
    records?: number;
    keys?: {
        [key: string]: any;
    };
}
export interface PreparedStatement {
    sql: string;
    values: any[];
}
export interface EntityMapper<T> {
    table: string;
    primaryKey: string;
    autoIncrement?: string;
}
export declare function createRecordPersist<T>(data: T, schema: SchemaOf<T>, mapper: EntityMapper<T>): DataRecordPersist;
export declare function assignAutoIncrement<T>(id: any, data: T, mapper: EntityMapper<T>): T;
export declare function mapperToEntity<T>(original: any, schema: SchemaOf<T>): T;
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
    queryEntity<T>(mapper: SchemaOf<T>, query: string, params: object | any[]): Promise<T[]>;
}
export declare function getMockDataSource(): DataSource;
