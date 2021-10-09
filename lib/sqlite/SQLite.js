"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLite = void 0;
const sqlite3_1 = require("sqlite3");
const DataSource_1 = require("../DataSource");
const layer_logging_1 = require("layer-logging");
const SQLiteSqlGenerator_1 = require("./SQLiteSqlGenerator");
const log = new layer_logging_1.Logger('sqlite');
class SQLite {
    constructor(path, config = {}) {
        this.path = path;
        this.config = config;
        this.driverName = 'sqlite';
        this.db = new sqlite3_1.Database(path, config.callback);
        this.sqlGenerator = new SQLiteSqlGenerator_1.SQLiteSqlGenerator(this);
    }
    sqlOut(sql) {
        if (this.config.echoSQL === true) {
            log.trace(`[SQL] ${sql}`);
        }
    }
    sqlOutError(sql) {
        if (this.config.echoErrorSQL === true) {
            log.error(`[FAILED] [SQL] ${sql}`);
        }
    }
    getClosestType(type) {
        return type;
    }
    async insert(data, schema, mapper) {
        const recordPersist = DataSource_1.createRecordPersist(data, schema, mapper);
        const generator = this.sqlGenerator;
        const st = generator.insertStatement(recordPersist);
        const queryResult = await this.queryRun(st.sql, st.values);
        return DataSource_1.assignAutoIncrement(queryResult.lastID, data, mapper);
    }
    async update(data, schema, mapper) {
        const recordPersist = DataSource_1.createRecordPersist(data, schema, mapper);
        const generator = this.sqlGenerator;
        const st = generator.updateStatement(recordPersist);
        await this.queryRun(st.sql, st.values);
    }
    async delete(data, schema, mapper) {
        const recordPersist = DataSource_1.createRecordPersist(data, schema, mapper);
        const generator = this.sqlGenerator;
        const st = generator.deleteStatement(recordPersist);
        await this.queryRun(st.sql, st.values);
    }
    async createTable(table) {
        const generator = this.sqlGenerator;
        const statement = generator.createTableStatement(table);
        return this.queriesRun(statement);
    }
    async getTableNames() {
        return this.queryData(`SELECT name FROM sqlite_master WHERE type='table'`)
            .then(data => data.map(row => row.name));
    }
    async queriesRun(sql) {
        return new Promise((resolve, reject) => {
            this.sqlOut(sql);
            this.db.exec(sql, err => {
                if (err) {
                    this.sqlOutError(sql);
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    run(query, params) {
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
    async queryRun(query, params = []) {
        try {
            this.sqlOut(query);
            return await this.run(query, params);
        }
        catch (e) {
            this.sqlOutError(query);
            return Promise.reject(e);
        }
    }
    async queryData(query, params = []) {
        return new Promise((resolve, reject) => {
            this.sqlOut(query);
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    this.sqlOutError(query);
                    reject(err);
                }
                else {
                    resolve(rows);
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