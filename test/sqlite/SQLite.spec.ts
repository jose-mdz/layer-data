import {assert} from 'chai';
import {SQLite} from "../../src/sqlite/SQLite";
import * as fs from "fs";
import {SchemaOf} from "layer-validation";
import {DataSource, EntityMapper} from "../../src/DataSource";
import {MigrationManager} from "../../src/MigrationManager";
import {EntityRepository} from "../../src/EntityRepository";

describe(`sqlite/SQLite`, function () {

    interface PersonEntity{
        id: number;
        name: string;
    }

    const single_migration = `res/schema/sqlite/single_migration`;

    const PersonEntitySchema: SchemaOf<PersonEntity> = {
        properties:{
            "id": {type: "number"},
            "name": {type: "string"},
        },
        required: ["id", "name"]
    };

    const PersonEntityMapper: EntityMapper<PersonEntity> = {
        table: "person",
        primaryKey: "id",
        autoIncrement: "id"
    };

    class PersonRepo extends EntityRepository<PersonEntity>{
        constructor(readonly db: DataSource){
            super(db, PersonEntitySchema, PersonEntityMapper);
        }
    }

    function randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    function randomChar() {
        return Math.random() > 0.5 ? String.fromCharCode(randomInt(65, 90)) : String.fromCharCode(randomInt(97, 122));
    }

    function randomWord(length: number = 10) {
        return new Array(length).fill('').map(c => randomChar()).join('');
    }

    function times(n: number, callback: (i: number) => void): any[] {

        if(isNaN(n) || !isFinite(n) || n <= 0) {
            return [];
        }

        const result: any[] = [];

        for(let i = 0; i < n; i++){
            result.push(callback(i));
        }

        return result;
    }

    let dbPath: string = `sqlite-tests.db`;
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

    it('should create a database file on connection', function () {
        const file = `${randomWord()}.db`;

        return new Promise(((resolve) => {
            new SQLite(file, {callback: () => {
                assert.isTrue(fs.existsSync(file));
                fs.unlinkSync(file);
                resolve();
            }});
        }));
    });

    it('should list tables', function () {
        // TODO: Implement
    });

    it('should insert an autoincrement record', async function () {
        const p = await repo.insert({id: 0, name: randomWord() });

        assert.strictEqual(p.id, 1);

        const all = await repo.getAll();

        assert.strictEqual(all.length, 1);
    });

    it('should insert a non-autoincrement record', function () {
        // TODO: Implement
    });

    it('should update a record', async function () {
        const p = await repo.insert({id: 0, name: randomWord() } );
        const newName = randomWord();

        await repo.update({id: 1, name: newName});
        const persisted = await repo.getOne(1);

        assert.strictEqual(persisted.id, 1);
        assert.strictEqual(persisted.name, newName);
    });

    it('should delete a record', async function () {
        // TODO: Implement
    });

    it('should echo SQL on logs if config allows', function () {
        // TODO: Implement
    });

    it('should read multiple records', function () {

    });

    it('should update multiple records', function () {

    });

    it('should delete multiple records', function () {
        
    });

});