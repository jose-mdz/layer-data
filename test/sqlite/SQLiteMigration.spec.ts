import {assert} from 'chai';
import {SQLite} from "../../src/sqlite/SQLite";
import * as fs from "fs";
import {MigrationEntity, MigrationManager, MigrationUnit} from "../../src/MigrationManager";
import {randomWord, randomWords} from "../TestUtils";
import {Logger} from "layer-logging";
import {getMockDataSource} from "../../src/DataSource";
import {SchemaOf} from "layer-validation";

describe(`SQLiteMigration`, function () {

    const config = {schemaPath: ''};
    let dbPath: string = `sqlite-migration.db`;
    let db: SQLite;

    const migrationA: MigrationUnit = {
        version: randomWord(),
        name: randomWords(),
        contents: `CREATE TABLE person (a TEXT)`,
        checksum: ``
    };
    migrationA.checksum = MigrationManager.getChecksum(migrationA.name, migrationA.contents);

    const migrationB: MigrationUnit = {
        version: randomWords(),
        name: randomWords(),
        contents: `CREATE TABLE thing(b TEXT)`,
        checksum: ``
    };
    migrationB.checksum = MigrationManager.getChecksum(migrationB.name, migrationB.contents);

    before(function(){
        Logger.voidAllConsumers();
    });

    after(function () {
        Logger.restoreConsumersToDefaults();
    });

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

    it('should infer name and version of migration from a file name', function () {
        const version_in = randomWord();
        const name_in = randomWord();
        const file = `${version_in}__${name_in}.sql`;
        const {version, name} = MigrationManager.getNameAndVersionFromFileName(file);
        assert.strictEqual(version, version_in);
        assert.strictEqual(name, name_in);
    });

    it('should infer name and version of migration from a file name, funny casing extension', function () {
        const version_in = randomWord();
        const name_in = randomWord();
        const file = `${randomWords()}/${randomWords()}__${randomWord()}/${version_in}__${name_in}.sQl`;
        const {version, name} = MigrationManager.getNameAndVersionFromFileName(file);
        assert.strictEqual(version, version_in);
        assert.strictEqual(name, name_in);
    });

    it('should break if file name empty', function () {
        return assert.throw(() => MigrationManager
            .breakIfInvalidFileNameForMigration(""));
    });

    it('should not break if funny casing on the extension', function () {
        const file_name = `${randomWord()}__${randomWord()}.SQL`;
        return assert.doesNotThrow(() => MigrationManager
            .breakIfInvalidFileNameForMigration(file_name));
    });

    it('should break if invalid file extension', function () {
        const name = `${randomWord()}/${randomWord()}__${randomWord()}`;
        assert.doesNotThrow(() => MigrationManager
            .breakIfInvalidFileNameForMigration(`${name}.sql`));
        assert.throws(() => MigrationManager
            .breakIfInvalidFileNameForMigration(`${name}`));
        assert.throws(() => MigrationManager
            .breakIfInvalidFileNameForMigration(`${name}.`));
        assert.throws(() => MigrationManager
            .breakIfInvalidFileNameForMigration(`${name}.pdf`));
        assert.throws(() => MigrationManager
            .breakIfInvalidFileNameForMigration(`${name}.sqll`));
        assert.throws(() => MigrationManager
            .breakIfInvalidFileNameForMigration(`${name}.sq`));
        assert.throws(() => MigrationManager
            .breakIfInvalidFileNameForMigration(`${name}sql`));
    });

    it('should break if no version__name combo', function () {
        const file_name = `${randomWords()}.sql`;

        return assert.throws(() =>
            MigrationManager.breakIfInvalidFileNameForMigration(file_name));
    });

    it('should calculate same check-sums for same characteristics', function () {
        const name = randomWords();
        const content = randomWords();
        const a = MigrationManager.getChecksum(name, content);
        const b = MigrationManager.getChecksum(name, content);

        assert.strictEqual(a, b);
    });

    it('should calculate different check-sums for different contents', function () {
        const name = randomWords();
        const content = randomWords();
        const a = MigrationManager.getChecksum(name, content + `\n`);
        const b = MigrationManager.getChecksum(name, content);

        assert.notStrictEqual(a, b);
    });

    it('should calculate different check-sums for different names', function () {
        const name = randomWords();
        const content = randomWords();
        const a = MigrationManager.getChecksum(name + `\n`, content);
        const b = MigrationManager.getChecksum(name, content);

        assert.notStrictEqual(a, b);
    });

    it('should return zero migrations when zero migrations both sides', async function () {
        const mm = new MigrationManager(db, config);
        const r = await mm.getMigrationsToBeApplied([], []);
        assert.strictEqual(r.length, 0);
    });

    it('should return single migration to be applied', async function () {

        const mm = new MigrationManager(db, config);
        const result = await mm.getMigrationsToBeApplied([], [migrationA]);

        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(migrationA, result[0]);
    });

    it('should return zero migrations to be applied when both migrations equal', async function () {

        const mm = new MigrationManager(db, config);
        const result = await mm.getMigrationsToBeApplied([migrationA], [migrationA]);

        assert.strictEqual(result.length, 0);
    });

    it('should return missing migrations', async function () {

        const mm = new MigrationManager(db, config);
        const result = await mm.getMigrationsToBeApplied(
            [migrationA], [migrationA, migrationB]);

        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0], migrationB);
    });

    it('should break because of more migrations on FS', async function () {
        const mm = new MigrationManager(db, config);
        let flag = false;

        try{
            await mm.getMigrationsToBeApplied(
                [migrationA, migrationB],
                [migrationA]
            );
        }catch(e){
            flag = true;
        }

        assert.isTrue(flag);
    });

    it('should break because of skipped migration on db', async function () {
        const mm = new MigrationManager(db, config);
        let flag = false;

        try{
            await mm.getMigrationsToBeApplied(
                [migrationB],
                [migrationA, migrationB]
            );
        }catch(e){
            flag = true;
        }

        assert.isTrue(flag);
    });

    it('should break if FS checksum does not correspond to DB checksum', async function () {

        const mm = new MigrationManager(db, config);
        let flag = false;

        try{
            await mm.getMigrationsToBeApplied(
                [migrationB],
                [migrationA]
            );
        }catch(e){
            flag = true;
        }

        assert.isTrue(flag);

    });

    it('should load existing migrations in data source', async function () {

        const ds = getMockDataSource();
        const mm = new MigrationManager(ds, config);

        const applied = {
            id: 1,
            version: randomWord(),
            name: randomWords(),
            applied: Date.now(),
            checksum: randomWord()
        };

        ds.queryEntity = async <T>(
            mapper: SchemaOf<T>,
            query: string,
            params: object): Promise<T[]> => [applied as any];

        const migs = await mm.loadMigrationsInDatabaseTable();

        assert.strictEqual(migs.length, 1);
        assert.strictEqual(migs[0].checksum, applied.checksum);

    });

    it('should handle error while retrieving migrations in db', async function () {

        const ds = getMockDataSource();
        const mm = new MigrationManager(ds, config);
        let flag = false;

        ds.queryEntity = async <T>(
            mapper: SchemaOf<T>,
            query: string,
            params: object): Promise<T[]> => Promise.reject(randomWord());

        try{
            await mm.loadMigrationsInDatabaseTable();
        }catch(e){
            flag = true;
        }

        assert.isTrue(flag);

    });

    it('should load migrations in FS', async function () {
        const mm = new MigrationManager(db, {...config, schemaPath: `res/schema/sqlite/single_migration`});
        const migrations = await mm.loadMigrationsInFileSystem();

        assert.strictEqual(migrations.length, 1);

    });

    it('should break when migrations path is nonexistent', async function () {
        const mm = new MigrationManager(db, {...config, schemaPath: `${randomWord()}/${randomWord()}`});
        let flag = false;

        try{
            await mm.loadMigrationsInFileSystem();
        }catch(e){
            flag = true;
        }

        assert.isTrue(flag);

    });

    it('should apply a migration', async function () {
        const ds = getMockDataSource();
        const mm = new MigrationManager(ds, config);
        const runQueries: string[] = [];

        ds.queriesRun = async (q: string): Promise<void> => {
            runQueries.push(q);
        };

        await mm.applyMigration(migrationA);

        assert.strictEqual(runQueries.length, 1);
        assert.strictEqual(runQueries[0], migrationA.contents);

    });

    it('should break at a migration error', async function () {
        const ds = getMockDataSource();
        const mm = new MigrationManager(ds, config);
        let flag = false;

        ds.queriesRun = async (q: string): Promise<void> => Promise.reject(randomWord());

        try{
            await mm.applyMigration(migrationA);
        }catch(e){
            flag = true;
        }

        assert.isTrue(flag);

    });

    it('should apply several migrations sequentially', async function () {
        const ds = getMockDataSource();
        const mm = new MigrationManager(ds, config);
        const runQueries: string[] = [];

        ds.queriesRun = (q: string): Promise<void> =>
            new Promise<void>(resolve => {
                runQueries.push(q);
                const time = (3 - runQueries.length) * 2 + 1;
                setTimeout(resolve, time);

            });

        await mm.applyMigrations([migrationA, migrationB, migrationA]);

        assert.strictEqual(runQueries.length, 3);
        assert.strictEqual(runQueries[0], migrationA.contents);
        assert.strictEqual(runQueries[1], migrationB.contents);
        assert.strictEqual(runQueries[2], migrationA.contents);
    });

    it('should stop applying migrations if one breaks', async function () {
        const ds = getMockDataSource();
        const mm = new MigrationManager(ds, config);
        const runQueries: string[] = [];
        let flag = false;

        ds.queriesRun = (q: string): Promise<void> =>
            new Promise<void>((resolve, reject) => {
                runQueries.push(q);
                const time = (3 - runQueries.length) * 2 + 1;
                if(runQueries.length == 2) {
                    reject();
                }else{
                    setTimeout(resolve, time);
                }
            });

        try{
            await mm.applyMigrations([migrationA, migrationB, migrationA]);
        }catch(e){
            flag = true;
        }

        assert.isTrue(flag);
        assert.strictEqual(runQueries.length, 2);
        assert.strictEqual(runQueries[0], migrationA.contents);
        assert.strictEqual(runQueries[1], migrationB.contents);
    });

    it('should gracefully handle empty state of migrations', async function () {
        const mm = new MigrationManager(db, {...config, schemaPath: `res/schema/sqlite/empty`});
        await mm.makeSureMigrationsAreUpToDate();
    });

});