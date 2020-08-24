import {assert} from 'chai'
import {SQLite} from "../../src/sqlite/SQLite";
import * as fs from "fs";
import {DataColumnDefinition, DataRecordPersist, DataTableDefinition} from "../../src/DataSource";
import {randomWord, randomWords} from "../TestUtils";
import {SQLiteSqlGenerator} from "../../src/sqlite/SQLiteSqlGenerator";

describe('/SQLiteSqlGenerator', function () {

    let dbPath: string = `sqlite-sql-generator.db`;
    let db: SQLite;
    let generator: SQLiteSqlGenerator;

    beforeEach(async function () {
        return new Promise((resolve => {
            db = new SQLite(dbPath, { callback: () => resolve() });
            generator = db.sqlGenerator;
        }));
    });

    afterEach(function () {
        if(fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
        }
    });

    it('should create simple column definition', function () {

        const cd: DataColumnDefinition = {
            name: randomWord(),
            type: 'TEXT'
        };

        const r = generator.createColumnDefinition(cd);

        assert.strictEqual(r, `${cd.name} ${db.getClosestType(cd.type)}`);

    });

    it('should create column def with auto increment', function () {
        const cd: DataColumnDefinition = {
            name: randomWord(),
            type: 'TEXT',
            isAutoIncrement: true,
        };

        const r = generator.createColumnDefinition(cd);

        assert.strictEqual(r, `${cd.name} ${db.getClosestType(cd.type)} AUTOINCREMENT`);
    });

    it('should create column def with prim key', function () {
        const cd: DataColumnDefinition = {
            name: randomWord(),
            type: 'TEXT',
            primaryKey: true,
        };

        const r = generator.createColumnDefinition(cd);

        assert.strictEqual(r, `${cd.name} ${db.getClosestType(cd.type)} PRIMARY KEY`);
    });

    it('should create column def with NOT NULL', function () {
        const cd: DataColumnDefinition = {
            name: randomWord(),
            type: 'TEXT',
            notNull: true,
        };

        const r = generator.createColumnDefinition(cd);

        assert.strictEqual(r, `${cd.name} ${db.getClosestType(cd.type)} NOT NULL`);
    });

    it('should create simple CREATE TABLE statement', function () {
        const cd: DataColumnDefinition = {
            name: randomWord(),
            type: 'TEXT'
        };
        const t: DataTableDefinition = {
            name: randomWord(),
            columns: [cd]
        };

        const r = generator.createTableStatement(t);

        assert.strictEqual(r, `CREATE TABLE ${t.name}(${cd.name} ${db.getClosestType(cd.type)})`)

    });

    it('should get a simple DELETE stmt', function () {
        const table = randomWord();
        const column = randomWord();
        const value = randomWord();
        const persist: DataRecordPersist = {
            table,
            columns: [],
            values: [],
            keys: Object.fromEntries([[column, value]])
        };

        const stmt = generator.deleteStatement(persist);

        assert.strictEqual(stmt.sql, `DELETE FROM ${table} WHERE ${column} = ?`);
        assert.strictEqual(stmt.values.length, 1);
        assert.strictEqual(stmt.values[0], value);
    });

    it('should break if more than one DELETE Requested', function () {
        let flag = false;

        try{
            generator.deleteStatement({
                table: randomWord(),
                columns: [], values: [],
                records: 2,
                keys: {}
            })
        }catch(e){
            flag = true;
        }

        assert.isTrue(flag);
    });

    it('should break if DELETE requested without keys', function () {
        let flag = false;

        try{
            generator.deleteStatement({
                table: randomWord(),
                columns: [], values: [],
                keys: {}
            })
        }catch(e){
            flag = true;
        }

        assert.isTrue(flag);
    });

    it('should create simple INSERT statement', function () {
        const table = randomWord();
        const column = randomWord();
        const value = randomWords();

        const persist : DataRecordPersist = {
            table,
            columns: [column],
            values: [value],
        };

        const stmt = generator.insertStatement(persist);

        assert.strictEqual(stmt.sql, `INSERT INTO ${table}(${column}) VALUES (?)`);
        assert.strictEqual(stmt.values.length, 1);
        assert.strictEqual(stmt.values[0], value);
    });

    it('should create INSERT stmt for 2 records', function () {
        const table = randomWord();
        const column = randomWord();
        const value1 = randomWords();
        const value2 = randomWords();

        const persist : DataRecordPersist = {
            table,
            records: 2,
            columns: [column],
            values: [[value1], [value2]],
        };

        const stmt = generator.insertStatement(persist);

        assert.strictEqual(stmt.sql, `INSERT INTO ${table}(${column}) VALUES (?), (?)`);
        assert.strictEqual(stmt.values.length, 2);
        assert.strictEqual(stmt.values[0], value1);
        assert.strictEqual(stmt.values[1], value2);
    });

    it('should break INSERT if no columns specified', function () {
        let flag = false;

        try{
            generator.insertStatement({
                table: randomWord(),
                columns: [], values: [],
                keys: {}
            })
        }catch(e){
            flag = true;
        }

        assert.isTrue(flag);
    });

    it('should break INSERT if column / value qty mismatch', function () {
        let flag = false;

        try{
            generator.insertStatement({
                table: randomWord(),
                columns: [randomWord()], values: [randomWord(), randomWord()],
                keys: {}
            })
        }catch(e){
            flag = true;
        }

        assert.isTrue(flag);
    });

    it('should break INSERT if values / number of records mismatch', function () {
        let flag = false;

        try{
            generator.insertStatement({
                table: randomWord(),
                records: 2,
                columns: [randomWord()], values: [randomWord(), randomWord(), randomWord()],
                keys: {}
            })
        }catch(e){
            flag = true;
        }

        assert.isTrue(flag);
    });

    it('should break if multiple records, column / value mismatch', function () {
        let flag = false;

        try{
            generator.insertStatement({
                records: 2,
                table: randomWord(),
                columns: [randomWord()],
                values: [[randomWord()], []],
                keys: {}
            })
        }catch(e){
            flag = true;
        }

        assert.isTrue(flag);
    });

    it('should break INSERT if multi-record and values entry is not array', function () {
        let flag = false;

        try{
            generator.insertStatement({
                records: 2,
                table: randomWord(),
                columns: [randomWord()],
                values: [randomWord(), []],
                keys: {}
            })
        }catch(e){
            flag = true;
        }

        assert.isTrue(flag);
    });

    it('should create simple UPDATE statement', function () {
        const table = randomWord();
        const column = randomWord();
        const value = randomWords();

        const persist : DataRecordPersist = {
            table,
            columns: [column],
            values: [value],
            keys: Object.fromEntries([[column, value]])
        };

        const stmt = generator.updateStatement(persist);

        assert.strictEqual(stmt.sql, `UPDATE ${table} SET ${column} = ? WHERE ${column} = ?`);
        assert.strictEqual(stmt.values.length, 2);
        assert.strictEqual(stmt.values[0], value);
    });

    it('should break if UPDATE of more than one record', function () {
        let flag = false;

        try{
            generator.updateStatement({
                table: randomWord(),
                records: 2,
                columns: [randomWord()],
                values: [[randomWord()], [randomWord()]],
            })
        }catch(e){
            flag = true;
        }

        assert.isTrue(flag);
    });

    it('should break if UPDATE without keys', function () {
        let flag = false;

        try{
            generator.updateStatement({
                table: randomWord(),
                columns: [randomWord()],
                values: [randomWord()]
            })
        }catch(e){
            flag = true;
        }

        assert.isTrue(flag);
    });

});