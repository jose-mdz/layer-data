"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sqlite3_1 = require("sqlite3");
const DataSource_1 = require("../DataSource");
const SqlGenerator_1 = require("../SqlGenerator");
const layer_logging_1 = require("layer-logging");
const log = new layer_logging_1.Logger('sqlite');
class SQLite {
    constructor(path, config = {}) {
        this.path = path;
        this.config = config;
        this.driverName = 'sqlite';
        this.db = new sqlite3_1.Database(path, config.callback);
    }
    sqlOut(sql) {
        if (this.config.echoSQL === true) {
            log.debug(`[SQL] ${sql}`);
        }
    }
    getClosestType(type) {
        return type;
    }
    async insert(data, schema, mapper) {
        const recordPersist = DataSource_1.createRecordPersist(data, schema, mapper);
        const generator = new SqlGenerator_1.SqlGenerator(this);
        const st = generator.insertStatement(recordPersist);
        this.sqlOut(st.sql);
        const queryResult = await this.queryRun(st.sql, st.values);
        return DataSource_1.assignAutoIncrement(queryResult.lastID, data, mapper);
    }
    async update(data, schema, mapper) {
        const recordPersist = DataSource_1.createRecordPersist(data, schema, mapper);
        const generator = new SqlGenerator_1.SqlGenerator(this);
        const st = generator.updateStatement(recordPersist);
        this.sqlOut(st.sql);
        await this.queryRun(st.sql, st.values);
        return Promise.resolve();
    }
    async delete(data, schema, mapper) {
        return Promise.reject(new Error('Not implemented'));
    }
    async createTable(table) {
        const generator = new SqlGenerator_1.SqlGenerator(this);
        const statement = generator.createTableStatement(table);
        this.sqlOut(statement);
        return this.queriesRun(statement);
    }
    async getTableNames() {
        return this.queryData(`SELECT name FROM sqlite_master WHERE type='table'`)
            .then(data => data.map(row => row.name));
    }
    async queriesRun(sql) {
        return new Promise((resolve, reject) => {
            this.db.exec(sql, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this);
                }
            });
        });
    }
    async queryRun(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(query, params, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this);
                }
            });
        });
    }
    async queryData(query, params = []) {
        const data = [];
        return new Promise((resolve, reject) => {
            this.db.each(query, params, function (err, row) {
                if (err) {
                    reject(err);
                }
                else {
                    data.push(row);
                }
            }, err => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(data);
                }
            });
        });
    }
    async queryEntity(schema, query, params = []) {
        try {
            const data = await this.queryData(query, params);
            return Promise.resolve(data.map(e => DataSource_1.mapperToEntity(e, schema)));
        }
        catch (e) {
            return Promise.reject(e);
        }
    }
}
exports.SQLite = SQLite;
//# sourceMappingURL=SQLite.js.map