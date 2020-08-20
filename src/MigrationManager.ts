import {DataSource, DataTableDefinition, EntityMapper} from "./DataSource";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import {Logger} from "layer-logging";
import {SchemaOf} from "layer-validation";
import Dict = NodeJS.Dict;

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
const NAME_VERSION_SEP = '__';

export class MigrationManager{

    static getChecksum(file_name: string, contents: string): string{
        const shaSum = crypto.createHash('sha1');
        shaSum.update(file_name);
        shaSum.update(contents);

        return shaSum.digest('hex');
    }

    static breakIfInvalidFileNameForMigration(file_name: string){
        if(!file_name) {
            log.error(`No file name`);
            throw new Error('No file name provided');
        }

        if(!file_name.toLowerCase().endsWith('.sql')) {
            log.error(`Migration file name must end with .sql`);
            throw new Error('Invalid migration file extension');
        }
        const parts = file_name.split('__');

        if(parts.length != 2 || !parts[0] || !parts[1]) {
            log.error(`Invalid migration file name: ${file_name}. File pattern: VERSION__NAME.sql`);
            throw new Error('Invalid migration file name');
        }
    }

    static getNameAndVersionFromFileName(file_name: string): {version: string, name: string}{
        // const cleanName = path.basename(file_name, '.sql');
        const basename = path.basename(file_name);
        const cleanName = basename.substr(0, basename.length - 4);
        const parts = cleanName.split(NAME_VERSION_SEP);
        const version = parts[0];
        const name = parts[1].replace(/\_/g, ' ');
        return {version, name};
    }

    static migrationFromFile(filename: string, contents: string): MigrationUnit{

        MigrationManager.breakIfInvalidFileNameForMigration(filename);

        const {name, version} = MigrationManager.getNameAndVersionFromFileName(filename);
        const checksum = MigrationManager.getChecksum(filename, contents);

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

        const migrationsPath = this.appConfig.schemaPath;

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

        } catch (e) {
            return Promise.reject(e);
        }
    }

    async getMigrationsToBeApplied(migrationsDb: MigrationUnit[], migrationsFs: MigrationUnit[]): Promise<MigrationUnit[]>{

        if(migrationsDb.length > migrationsFs.length) {
            log.error(`There are more migrations in the database that there are in the file system. Aborting.`);

            throw new Error(`Mismatch of versions comparing database vs file system.`);
        }

        const migrationsToApply: MigrationUnit[] = [];

        // Check migrations match
        for(let i = 0; i < migrationsDb.length; i++){
            const migrationFs = migrationsFs[i];
            const migrationDb = migrationsDb[i];

            if(migrationFs.checksum != migrationDb.checksum) {
                const msg = `Migrations ${migrationFs.version}/${migrationDb.version} checksum doesn't match one on database`;
                log.error(msg);
                throw new Error(msg);
            }
        }

        for(let i = migrationsDb.length; i < migrationsFs.length; i++){
            migrationsToApply.push(migrationsFs[i]);
        }

        return migrationsToApply;
    }

    async applyMigrations(migrations: MigrationUnit[]): Promise<void>{

        try{
            for(let mig of migrations){
                await this.applyMigration(mig);
            }
        }catch(e){
            log.error(`Stopping migrations`);
            return Promise.reject();
        }
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
        const migrationsToApply = await this.getMigrationsToBeApplied(migrationsDb, migrationsFs);

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