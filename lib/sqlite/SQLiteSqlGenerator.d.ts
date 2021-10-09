import { SQLite } from "./SQLite";
import { SqlGenerator } from "../SqlGenerator";
import { DataColumnDefinition } from "../DataSource";
export declare class SQLiteSqlGenerator extends SqlGenerator<SQLite> {
    constructor(ds: SQLite);
    createColumnDefinition(column: DataColumnDefinition): string;
}
