import { Database, RunResult } from "sqlite3";
import { DataColumnType, DataSource, DataTableDefinition, EntityMapper } from "../DataSource";
import { SchemaOf } from "layer-validation";
import { SQLiteSqlGenerator } from "./SQLiteSqlGenerator";
export interface SQLiteConfig {
    callback?: () => void;
    echoSQL?: boolean;
    echoErrorSQL?: boolean;
}
export declare class SQLite implements DataSource {
    readonly path: string;
    readonly config: SQLiteConfig;
    readonly driverName = "sqlite";
    readonly db: Database;
    readonly sqlGenerator: SQLiteSqlGenerator;
    constructor(path: string, config?: SQLiteConfig);
    private sqlOut;
    private sqlOutError;
    getClosestType(type: DataColumnType): string;
    insert<T>(data: T, schema: SchemaOf<T>, mapper: EntityMapper<T>): Promise<T>;
    update<T>(data: T, schema: SchemaOf<T>, mapper: EntityMapper<T>): Promise<void>;
    delete<T>(data: T, schema: SchemaOf<T>, mapper: EntityMapper<T>): Promise<void>;
    createTable(table: DataTableDefinition): Promise<any>;
    getTableNames(): Promise<string[]>;
    queriesRun(sql: string): Promise<void>;
    private run;
    queryRun(query: string, params?: object | any[]): Promise<RunResult>;
    queryData(query: string, params?: object | any[]): Promise<any[]>;
    queryEntity<T>(schema: SchemaOf<T>, query: string, params?: object | any[]): Promise<T[]>;
}
