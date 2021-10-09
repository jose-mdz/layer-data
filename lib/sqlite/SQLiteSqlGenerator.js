"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteSqlGenerator = void 0;
const SqlGenerator_1 = require("../SqlGenerator");
class SQLiteSqlGenerator extends SqlGenerator_1.SqlGenerator {
    constructor(ds) {
        super(ds);
    }
    createColumnDefinition(column) {
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
exports.SQLiteSqlGenerator = SQLiteSqlGenerator;
//# sourceMappingURL=SQLiteSqlGenerator.js.map