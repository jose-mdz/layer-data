import {DataSource, DataTableDefinition, EntityMapper} from "./DataSource";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import {Logger} from "layer-logging";
import {SchemaOf} from "layer-validation";

export const MigrationTable: DataTableDefinition = {
    name: 'schema_migration',
    columns: [
        {name: 'id', type:'INTEGER', isAutoIncrement: true, primaryKey: true},
        {name: 'version', type:'VARCHAR', size: 20, notNull: true},
        {name: 'name', type:'VARCHAR', size: 128, notNull: true},
        {name: 'applied', type: 'DATETIME', notNull: true},
        {name: 'checksum', type:'TEXT', notNull: true},
    ]
};

export interface MigrationUnit {
    version: string;
    name: string;
    contents: string;
    checksum: string;
}

export interface MigrationEntity {
    id?: number;
    version: string;
    name: string;
    applied: number;
    checksum: string;
}

export const MigrationEntitySchema: SchemaOf<MigrationEntity> = {
    properties: {
        id: {type: 'number'},
        name: {type: 'string'},
        applied: {type: 'number'},
        checksum: {type: 'string'},
        version: {type: "string"},
    },
    required: ['name', 'applied', 'checksum', 'version']
};

export const MigrationEntityMapper: EntityMapper<MigrationEntity> = {
    table: MigrationTable.name,
    primaryKey: 'id',
    autoIncrement: 'id'
};

export interface MigrationConfig {
    schemaPath: string;
}

const log = new Logger('migration');

export class MigrationManager{

    static migrationFromFile(filename: string, contents: string): MigrationUnit{

        if(!filename.endsWith('.sql')) {
            log.error(`Migration file name must end with .sql`);
            throw 'Invalid migration file name';
        }

        const cleanName = path.basename(filename, '.sql');
        const parts = cleanName.split('__');

        if(parts.length != 2 || !parts[0] || !parts[1]) {
            log.error(`Invalid migration file name: ${filename}. File pattern: VERSION__NAME.sql`);
            throw 'Invalid migration file name'
        }

        const version = parts[0];
        const name = parts[1].replace(/\_/g, ' ');

        const shaSum = crypto.createHash('sha1');
        shaSum.update(filename);
        shaSum.update(contents);

        const checksum = shaSum.digest('hex');

        return {name, version, contents, checksum};
    }

    constructor(readonly dataSource: DataSource, readonly appConfig: MigrationConfig){}

    private async migrationTablePresent(): Promise<boolean>{
        return this.dataSource.getTableNames()
            .then(tables => tables.indexOf(MigrationTable.name) >= 0);
    }

    orderMigrations(migrations: MigrationUnit[]): MigrationUnit[]{
        return migrations.sort((a, b) => a.version.localeCompare(b.version));
    }

    async createMigrationTable(): Promise<void>{

        log.trace(`Migration table will be created`);

        return this.dataSource.createTable(MigrationTable);
    }

    async loadMigrationsInDatabaseTable(): Promise<MigrationUnit[]>{
        // Create table if needed
        if(!(await this.migrationTablePresent())) {
            await this.createMigrationTable();
        }

        try {

            // Bring all migrations
            const migrationEntities = await this.dataSource.queryEntity(
                MigrationEntitySchema, `SELECT * FROM ${MigrationTable.name} ORDER BY version`, []);

            // Map, order, dispatch
            return Promise.resolve(this.orderMigrations(migrationEntities.map(entity => ({
                version: entity.version,
                name: entity.name,
                contents: '',
                checksum: entity.checksum
            }))));
        } catch (e) {
            return Promise.reject(e);
        }
    }

    async loadMigrationsInFileSystem(): Promise<MigrationUnit[]>{

        const migrationsPath = path.join(this.appConfig.schemaPath, this.dataSource.driverName);

        if(!fs.existsSync(migrationsPath)) {
            log.error(`The migrations folder was not found: ${migrationsPath}`);
            return Promise.reject();
        }

        const dir = fs.readdirSync(migrationsPath);

        const migrations = dir
            .filter(file => file.toLowerCase().endsWith('.sql'))
            .map(file => MigrationManager.migrationFromFile(
                file, fs.readFileSync(path.join(migrationsPath, file), 'utf-8')));

        return Promise.resolve(this.orderMigrations(migrations));
    }

    async applyMigration(migration: MigrationUnit): Promise<void>{

        // TODO: This should happen in a Transaction to be able to rollback if anything goes wrong

        try {

            log.info(`Applying migration: (${migration.version}) ${migration.name}`);

            // Run migration
            await this.dataSource.queriesRun(migration.contents);

            // Insert migration row
            await this.dataSource.insert({
                version: migration.version,
                name: migration.name,
                checksum: migration.checksum,
                applied: Date.now()
            }, MigrationEntitySchema, MigrationEntityMapper);


            log.info(`Migration applied successfully: ${migration.version}`);

            return Promise.resolve();

        } catch (e) {
            return Promise.reject(e);
        }
    }

    async compareMigrations(migrationsDb: MigrationUnit[], migrationsFs: MigrationUnit[]): Promise<MigrationUnit[]>{
        /*
        * -- If there is more migrations in database than in FS, something's not right
        * If len(migrationsInDb) > len(migrationsInFs) Then Throw Exception
        */

        if(migrationsDb.length > migrationsFs.length) {
            log.error(`There are more migrations in the database that there are in the file system. Aborting.`);

            throw `Mismatch of versions comparing database vs file system.`;
        }

        /*
        * -- Here we check that already applied migrations match our list of migrations
        * For i = 0 to len(migrationsDb)
        *   If migrationsDb[i].check != migrationsFs[i].check Then
        *     Throw Exception "The migrations do not correspond"
        *   End If
        * End For
        */

        const migrationsFsByVersion: {[i: string]: MigrationUnit} = {};
        migrationsFs.forEach(m => migrationsFsByVersion[m.version] = m);

        migrationsDb.forEach(migration => {

            if(!(migration.version in migrationsFsByVersion)) {
                log.error(
                    `The migration on database version: "${migration.version}" was not found on local file system`);

                throw `Local migration not found`;
            }

            const fsMigration = migrationsFsByVersion[migration.version];

            if(migration.checksum !== fsMigration.checksum) {
                log.error(`The checksum of the migrations version "${migration.version}" do not match ` +
                    `(${migration.checksum} vs ${fsMigration.checksum})`);

                throw `Migration checksum mismatch`
            }

            // Delete migration from object
            delete migrationsFsByVersion[migration.version];
        });

        /*
        * -- Apply migrations not present
        * For j = i to len(migrationsFs)
        *   ApplyMigration(migrationsFs[j])
        * End For
        *
        * */

        let migrationsToApply: MigrationUnit[] = [];

        for(let name in migrationsFsByVersion){
            migrationsToApply.push(migrationsFsByVersion[name]);
        }

        migrationsToApply = this.orderMigrations(migrationsToApply);

        return Promise.resolve(migrationsToApply);
    }

    async applyMigrations(migrations: MigrationUnit[]): Promise<void[]>{

        return Promise.all(migrations.map(mig => this.applyMigration(mig)));

    }

    async makeSureMigrationsAreUpToDate(): Promise<DataSource>{

        log.trace(`Starting Migration Check`);

        /*
        * migrationsDb = loadMigrationsInDatabaseTable
        * migrationsFs = loadMigrationsInFileSystem (order by name)
        */

        const migrationsDb = await this.loadMigrationsInDatabaseTable();
        const migrationsFs = await this.loadMigrationsInFileSystem();

        // Get migrations that should be applied
        const migrationsToApply = await this.compareMigrations(migrationsDb, migrationsFs);

        // Apply migrations
        await Promise.all(migrationsToApply.map(async m => await this.applyMigration(m)));

        // Get latest migration to inform it
        const latestMigration = migrationsFs.length ? migrationsFs[migrationsFs.length - 1].version : 'None';

        log.info(`Migrations applied: ${migrationsToApply.length}; ` +
            `Migrations present: ${migrationsFs.length}; Latest: ${latestMigration}`);

        // Next!
        return Promise.resolve(this.dataSource);

    }

}