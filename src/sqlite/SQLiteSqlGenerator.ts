import {SQLite} from "./SQLite";
import {SqlGenerator} from "../SqlGenerator";
import {DataColumnDefinition} from "../DataSource";

export class SQLiteSqlGenerator extends SqlGenerator<SQLite>{

    constructor(ds: SQLite){
        super(ds);
    }

    createColumnDefinition(column: DataColumnDefinition): string{

        const size = 'size' in column ? `(${column.size})` : '';

        return [
            column.name,
            `${this.dataSource.getClosestType(column.type)}${size}`,
            column.primaryKey === true ? 'PRIMARY KEY' : null,
            column.isAutoIncrement === true ? 'AUTOINCREMENT' : null,
            column.notNull === true ? 'NOT NULL' : null,
        ].filter(p => !!p).join(' ');

    }
}