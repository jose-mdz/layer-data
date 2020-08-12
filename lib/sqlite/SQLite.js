"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLite = void 0;
const sqlite3_1 = require("sqlite3");
const DataSource_1 = require("../DataSource");
const SqlGenerator_1 = require("../SqlGenerator");
const layer_logging_1 = require("layer-logging");
const log = new layer_logging_1.Logger('sqlite');
class SQLite {
    constructor(path, callback) {
        this.path = path;
        this.driverName = 'sqlite';
        this.db = new sqlite3_1.Database(path, callback);
    }
    sqlOut(sql) {
        if (process.env.MOTHER_SQL_OUT === 'yes') {
            log.debug(`[SQL] ${sql}`);
        }
    }
    getClosestType(type) {
        return type;
    }
    insert(data, schema, mapper) {
        return __awaiter(this, void 0, void 0, function* () {
            const recordPersist = DataSource_1.createRecordPersist(data, schema, mapper);
            const generator = new SqlGenerator_1.SqlGenerator(this);
            const st = generator.insertStatement(recordPersist);
            this.sqlOut(st.sql);
            const queryResult = yield this.queryRun(st.sql, st.values);
            return DataSource_1.assignAutoIncrement(queryResult.lastID, data, mapper);
        });
    }
    update(data, schema, mapper) {
        return __awaiter(this, void 0, void 0, function* () {
            const recordPersist = DataSource_1.createRecordPersist(data, schema, mapper);
            const generator = new SqlGenerator_1.SqlGenerator(this);
            const st = generator.updateStatement(recordPersist);
            this.sqlOut(st.sql);
            yield this.queryRun(st.sql, st.values);
            return Promise.resolve();
        });
    }
    delete(data, schema, mapper) {
        return __awaiter(this, void 0, void 0, function* () {
            return Promise.reject();
        });
    }
    createTable(table) {
        return __awaiter(this, void 0, void 0, function* () {
            const generator = new SqlGenerator_1.SqlGenerator(this);
            const statement = generator.createTableStatement(table);
            this.sqlOut(statement);
            return this.queriesRun(statement);
        });
    }
    getTableNames() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.queryData(`SELECT name FROM sqlite_master WHERE type='table'`)
                .then(data => data.map(row => row.name));
        });
    }
    queriesRun(sql) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    queryRun(query, params = []) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    queryData(query, params = []) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    queryEntity(schema, query, params = []) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield this.queryData(query, params);
                return Promise.resolve(data.map(e => DataSource_1.mapperToEntity(e, schema)));
            }
            catch (e) {
                return Promise.reject(e);
            }
        });
    }
}
exports.SQLite = SQLite;
//# sourceMappingURL=SQLite.js.map