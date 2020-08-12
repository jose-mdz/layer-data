import {assert} from 'chai';
import {SQLite} from "../../src/sqlite/SQLite";
import * as fs from "fs";
import {MigrationManager} from "../../src/MigrationManager";

describe(`SQLiteMigration`, function () {

    let dbPath: string = `sqlite-migration.db`;
    let db: SQLite;

    beforeEach(async function () {
        return new Promise((resolve => {
            db = new SQLite(dbPath, { callback: () => resolve() });
        }));
    });

    afterEach(function () {
        if(fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
        }
    });

    it('should load MigrationUnits', async function () {
        const mm = new MigrationManager(db, {schemaPath:`res/schema/sqlite/single_migration`});
        const units = await mm.loadMigrationsInFileSystem();
        assert.strictEqual(units.length, 1);
    });

    it('should load single migration in FS', async function () {
        const mm = new MigrationManager(db, {schemaPath:`res/schema/sqlite/single_migration`});
        const units = await mm.loadMigrationsInFileSystem();

        assert.strictEqual(units.length, 1);
        assert.strictEqual("Initial Schema", units[0].name);
        assert.strictEqual("V01", units[0].version);

    });

    it('should apply single migration', async function () {
        const mm = new MigrationManager(db, {schemaPath:`res/schema/sqlite/single_migration`});
        await mm.makeSureMigrationsAreUpToDate();
        const tables = await db.getTableNames();

        // Single migration table name is person
        assert.strictEqual(tables.filter(t => t === `person`).length, 1);
        assert.strictEqual(tables.filter(t => t === `schema_migration`).length, 1);

    });

    it('should load multiple migrations', async function () {
        const mm = new MigrationManager(db, {schemaPath:`res/schema/sqlite/multiple_migrations`});
        await mm.makeSureMigrationsAreUpToDate();
        const tables = await db.getTableNames();

        // Single migration table name is person
        assert.strictEqual(tables.filter(t => t === `person`).length, 1);
        assert.strictEqual(tables.filter(t => t === `schema_migration`).length, 1);
    });

    it('should generate an error if migration inconsistency', function () {

    });

});