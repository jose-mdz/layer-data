import {assert} from "chai";
import {SQLite} from "../../src/sqlite/SQLite";
import {PersonRepo} from "../PersonEntity";
import {MigrationManager} from "../../src/MigrationManager";
import * as fs from "fs";
import {Logger} from "layer-logging";
import {randomWord, times} from "../TestUtils";

describe(`EntityRepository`, function () {

    const single_migration = `res/schema/sqlite/single_migration`;
    let dbPath: string = `sqlite-repository.db`;
    let db: SQLite;
    let repo: PersonRepo;

    beforeEach(async function () {
        return new Promise((resolve => {
            db = new SQLite(dbPath, { callback: async () => {
                    const mm = new MigrationManager(db, {schemaPath: single_migration});
                    await mm.makeSureMigrationsAreUpToDate();
                    repo = new PersonRepo(db);
                    resolve();
                }
            });
        }));
    });

    afterEach(function () {
        if(fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
        }
    });

    before(function () {
        Logger.voidAllConsumers();
    });

    after(function () {
        Logger.restoreConsumersToDefaults();
    });

    it('should delete all records', async function () {

        const n = 3;

        for(let i = 0; i < n; i++){
            await repo.insert({id:0, name:randomWord()});
        }

        const all = await repo.getAll();

        assert.strictEqual(all.length, n);

        await repo.deleteAll();

        const emptyAll = await repo.getAll();

        assert.strictEqual(emptyAll.length, 0);

    });
});