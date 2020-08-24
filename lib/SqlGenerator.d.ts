import { DataColumnDefinition, DataRecordPersist, DataSource, DataTableDefinition, PreparedStatement } from "./DataSource";
export declare abstract class SqlGenerator<T extends DataSource> {
    readonly dataSource: T;
    protected constructor(dataSource: T);
    private getFlatValues;
    abstract createColumnDefinition(column: DataColumnDefinition): string;
    createTableStatement(table: DataTableDefinition): string;
    deleteStatement(record: DataRecordPersist, placeHolder?: string): PreparedStatement;
    insertStatement(record: DataRecordPersist, placeHolder?: string): PreparedStatement;
    updateStatement(record: DataRecordPersist, placeHolder?: string): PreparedStatement;
}
