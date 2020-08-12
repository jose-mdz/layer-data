import { DataColumnDefinition, DataRecordPersist, DataSource, DataTableDefinition, PreparedStatement } from "./DataSource";
export declare class SqlGenerator {
    readonly dataSource: DataSource;
    constructor(dataSource: DataSource);
    private getFlatValues;
    createColumnDefinition(column: DataColumnDefinition): string;
    createTableStatement(table: DataTableDefinition): string;
    deleteStatement(record: DataRecordPersist, placeHolder?: string): PreparedStatement;
    insertStatement(record: DataRecordPersist, placeHolder?: string): PreparedStatement;
    updateStatement(record: DataRecordPersist, placeHolder?: string): PreparedStatement;
}
