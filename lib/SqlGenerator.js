"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlGenerator = void 0;
class SqlGenerator {
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    getFlatValues(records, record) {
        const flatValues = [];
        if (record.columns.length === 0) {
            throw `No columns specified`;
        }
        else if (records === 1) {
            if (record.columns.length === record.values.length) {
                record.values.forEach(value => flatValues.push(value));
            }
            else {
                throw `Column/Value count don't match`;
            }
        }
        else {
            if (records !== record.values.length) {
                throw `Specified persist of ${records} record(s). Received values for ${record.values.length}`;
            }
            record.values.forEach((entry, i) => {
                if (entry instanceof Array) {
                    if (entry.length === record.columns.length) {
                        entry.forEach(value => flatValues.push(value));
                    }
                    else {
                        throw `Values for record at ${i} does not match the number of columns(${record.columns.length})`;
                    }
                }
                else {
                    throw `Values for record at ${i} is not an array`;
                }
            });
        }
        return flatValues;
    }
    createTableStatement(table) {
        const columns = table.columns
            .map(c => this.createColumnDefinition(c))
            .join(', ');
        return `CREATE TABLE ${table.name}(${columns})`;
    }
    deleteStatement(record, placeHolder = '?') {
        const records = record.records || 1;
        const pairs = [];
        const keyValues = [];
        let keyCounter = 0;
        if (records !== 1) {
            throw `Multiple deletes not supported`;
        }
        for (let name in record.keys) {
            pairs.push(`${name} = ${placeHolder}`);
            keyValues.push(record.keys[name]);
            keyCounter++;
        }
        if (keyCounter == 0) {
            throw new Error(`No keys on DELETE statement`);
        }
        return {
            sql: `DELETE FROM ${record.table} WHERE ${pairs}`,
            values: keyValues
        };
    }
    insertStatement(record, placeHolder = '?') {
        const records = record.records || 1;
        const flatValues = this.getFlatValues(records, record);
        const columns = record.columns.join(', ');
        const placeHoldersOneRecord = '(' + (new Array(record.columns.length)).fill(placeHolder).join(`, `) + ')';
        const placeHolders = records > 1 ? (new Array(records)).fill(placeHoldersOneRecord).join(', ') : placeHoldersOneRecord;
        return {
            sql: `INSERT INTO ${record.table}(${columns}) VALUES ${placeHolders}`,
            values: flatValues
        };
    }
    updateStatement(record, placeHolder = '?') {
        const records = record.records || 1;
        const flatValues = this.getFlatValues(records, record);
        if (records !== 1) {
            throw `Multiple updates not supported`;
        }
        const keyPairs = [];
        const pairs = record.columns.map(name => `${name} = ${placeHolder}`);
        let keyCount = 0;
        for (let name in record.keys) {
            keyPairs.push(`${name} = ${placeHolder}`);
            flatValues.push(record.keys[name]);
            keyCount++;
        }
        if (keyCount == 0) {
            throw `Updates with no key values not supported`;
        }
        return {
            sql: `UPDATE ${record.table} SET ${pairs.join(', ')} WHERE ${keyPairs.join(' AND ')}`,
            values: flatValues
        };
    }
}
exports.SqlGenerator = SqlGenerator;
//# sourceMappingURL=SqlGenerator.js.map