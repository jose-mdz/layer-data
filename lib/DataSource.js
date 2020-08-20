"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const layer_validation_1 = require("layer-validation");
function createRecordPersist(data, schema, mapper) {
    const table = mapper.table;
    const records = 1;
    const columns = [];
    const values = [];
    const keys = {};
    keys[mapper.primaryKey] = data[mapper.primaryKey];
    for (let column in schema.properties) {
        const isAutoIncrement = mapper.autoIncrement && mapper.autoIncrement.indexOf(column) >= 0;
        if (column in data && !isAutoIncrement) {
            const value = data[column];
            columns.push(column);
            values.push(value);
        }
    }
    return { table, columns, values, records, keys };
}
exports.createRecordPersist = createRecordPersist;
function assignAutoIncrement(id, data, mapper) {
    const autoIncName = mapper.autoIncrement;
    if (autoIncName) {
        const idObject = {};
        idObject[autoIncName] = id;
        return Object.assign({}, data, idObject);
    }
    return data;
}
exports.assignAutoIncrement = assignAutoIncrement;
function mapperToEntity(original, schema) {
    const validator = new layer_validation_1.SchemaValidator();
    const killList = [];
    const data = Object.assign({}, original);
    for (let name in data) {
        const isRequired = schema.required && schema.required.indexOf(name) >= 0;
        const schemaType = schema.properties ? schema.properties[name].type || null : null;
        const canBeNull = schemaType ? schemaType === "null" || schemaType.indexOf('null') >= 0 : true;
        if (data[name] === null && !isRequired && !canBeNull) {
            killList.push(name);
        }
    }
    killList.forEach(name => delete data[name]);
    const valid = validator.isValid(data, schema);
    if (typeof valid === 'string') {
        throw `[DATA] object does not match schema: ${valid}`;
    }
    return data;
}
exports.mapperToEntity = mapperToEntity;
function getMockDataSource() {
    return {
        driverName: 'mockDataSource',
        getClosestType(type) {
            return type;
        },
        async createTable(table) {
        },
        async getTableNames() {
            return [];
        },
        async insert(data, schema, mapper) {
            return data;
        },
        async update(data, schema, mapper) {
        },
        async delete(data, schema, mapper) {
        },
        async queryRun(query, params) {
        },
        async queriesRun(query) {
        },
        async queryData(query, params) {
            return [];
        },
        async queryEntity(mapper, query, params) {
            return [];
        }
    };
}
exports.getMockDataSource = getMockDataSource;
//# sourceMappingURL=DataSource.js.map