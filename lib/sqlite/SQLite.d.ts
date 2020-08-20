import { Database, RunResult, Statement } from "sqlite3";
import { DataColumnType, DataSource, DataTableDefinition, EntityMapper } from "../DataSource";
import { SchemaOf } from "layer-validation";
export interface SQLiteConfig {
    callback?: () => void;
    echoSQL?: boolean;
}
export declare class SQLite implements DataSource {
    readonly path: string;
    readonly config: SQLiteConfig;
    readonly driverName = "sqlite";
    readonly db: Database;
    constructor(path: string, config?: SQLiteConfig);
    private sqlOut;
    getClosestType(type: DataColumnType): string;
    insert<T>(data: T, schema: SchemaOf<T>, mapper: EntityMapper<T>): Promise<T>;
    update<T>(data: T, schema: SchemaOf<T>, mapper: EntityMapper<T>): Promise<void>;
    delete<T>(data: T, schema: SchemaOf<T>, mapper: EntityMapper<T>): Promise<void>;
    createTable(table: DataTableDefinition): Promise<any>;
    getTableNames(): Promise<string[]>;
    queriesRun(sql: string): Promise<Statement>;
    queryRun(query: string, params?: object | any[]): Promise<RunResult>;
    queryData(query: string, params?: object | any[]): Promise<any[]>;
    queryEntity<T>(schema: SchemaOf<T>, query: string, params?: object | any[]): Promise<T[]>;
}
