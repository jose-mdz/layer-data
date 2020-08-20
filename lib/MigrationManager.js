"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const layer_logging_1 = require("layer-logging");
exports.MigrationTable = {
    name: 'schema_migration',
    columns: [
        { name: 'id', type: 'INTEGER', isAutoIncrement: true, primaryKey: true },
        { name: 'version', type: 'VARCHAR', size: 20, notNull: true },
        { name: 'name', type: 'VARCHAR', size: 128, notNull: true },
        { name: 'applied', type: 'DATETIME', notNull: true },
        { name: 'checksum', type: 'TEXT', notNull: true },
    ]
};
exports.MigrationEntitySchema = {
    properties: {
        id: { type: 'number' },
        name: { type: 'string' },
        applied: { type: 'number' },
        checksum: { type: 'string' },
        version: { type: "string" },
    },
    required: ['name', 'applied', 'checksum', 'version']
};
exports.MigrationEntityMapper = {
    table: exports.MigrationTable.name,
    primaryKey: 'id',
    autoIncrement: 'id'
};
const log = new layer_logging_1.Logger('migration');
const NAME_VERSION_SEP = '__';
class MigrationManager {
    constructor(dataSource, appConfig) {
        this.dataSource = dataSource;
        this.appConfig = appConfig;
    }
    static getChecksum(file_name, contents) {
        const shaSum = crypto.createHash('sha1');
        shaSum.update(file_name);
        shaSum.update(contents);
        return shaSum.digest('hex');
    }
    static breakIfInvalidFileNameForMigration(file_name) {
        if (!file_name) {
            log.error(`No file name`);
            throw new Error('No file name provided');
        }
        if (!file_name.toLowerCase().endsWith('.sql')) {
            log.error(`Migration file name must end with .sql`);
            throw new Error('Invalid migration file extension');
        }
        const parts = file_name.split('__');
        if (parts.length != 2 || !parts[0] || !parts[1]) {
            log.error(`Invalid migration file name: ${file_name}. File pattern: VERSION__NAME.sql`);
            throw new Error('Invalid migration file name');
        }
    }
    static getNameAndVersionFromFileName(file_name) {
        const basename = path.basename(file_name);
        const cleanName = basename.substr(0, basename.length - 4);
        const parts = cleanName.split(NAME_VERSION_SEP);
        const version = parts[0];
        const name = parts[1].replace(/\_/g, ' ');
        return { version, name };
    }
    static migrationFromFile(filename, contents) {
        MigrationManager.breakIfInvalidFileNameForMigration(filename);
        const { name, version } = MigrationManager.getNameAndVersionFromFileName(filename);
        const checksum = MigrationManager.getChecksum(filename, contents);
        return { name, version, contents, checksum };
    }
    async migrationTablePresent() {
        return this.dataSource.getTableNames()
            .then(tables => tables.indexOf(exports.MigrationTable.name) >= 0);
    }
    orderMigrations(migrations) {
        return migrations.sort((a, b) => a.version.localeCompare(b.version));
    }
    async createMigrationTable() {
        log.trace(`Migration table will be created`);
        return this.dataSource.createTable(exports.MigrationTable);
    }
    async loadMigrationsInDatabaseTable() {
        if (!(await this.migrationTablePresent())) {
            await this.createMigrationTable();
        }
        try {
            const migrationEntities = await this.dataSource.queryEntity(exports.MigrationEntitySchema, `SELECT * FROM ${exports.MigrationTable.name} ORDER BY version`, []);
            return Promise.resolve(this.orderMigrations(migrationEntities.map(entity => ({
                version: entity.version,
                name: entity.name,
                contents: '',
                checksum: entity.checksum
            }))));
        }
        catch (e) {
            return Promise.reject(e);
        }
    }
    async loadMigrationsInFileSystem() {
        const migrationsPath = this.appConfig.schemaPath;
        if (!fs.existsSync(migrationsPath)) {
            log.error(`The migrations folder was not found: ${migrationsPath}`);
            return Promise.reject();
        }
        const dir = fs.readdirSync(migrationsPath);
        const migrations = dir
            .filter(file => file.toLowerCase().endsWith('.sql'))
            .map(file => MigrationManager.migrationFromFile(file, fs.readFileSync(path.join(migrationsPath, file), 'utf-8')));
        return Promise.resolve(this.orderMigrations(migrations));
    }
    async applyMigration(migration) {
        try {
            log.info(`Applying migration: (${migration.version}) ${migration.name}`);
            await this.dataSource.queriesRun(migration.contents);
            await this.dataSource.insert({
                version: migration.version,
                name: migration.name,
                checksum: migration.checksum,
                applied: Date.now()
            }, exports.MigrationEntitySchema, exports.MigrationEntityMapper);
            log.info(`Migration applied successfully: ${migration.version}`);
            return Promise.resolve();
        }
        catch (e) {
            return Promise.reject(e);
        }
    }
    async getMigrationsToBeApplied(migrationsDb, migrationsFs) {
        if (migrationsDb.length > migrationsFs.length) {
            log.error(`There are more migrations in the database that there are in the file system. Aborting.`);
            throw new Error(`Mismatch of versions comparing database vs file system.`);
        }
        const a = Object.fromEntries([
            [0, 1]
        ]);
        const migrationsFsByVersion = {};
        migrationsFs.forEach(m => migrationsFsByVersion[m.version] = m);
        migrationsDb.forEach(migration => {
            if (!(migration.version in migrationsFsByVersion)) {
                log.error(`The migration on database version: "${migration.version}" was not found on local file system`);
                throw `Local migration not found`;
            }
            const fsMigration = migrationsFsByVersion[migration.version];
            if (migration.checksum !== fsMigration.checksum) {
                log.error(`The checksum of the migrations version "${migration.version}" do not match ` +
                    `(${migration.checksum} vs ${fsMigration.checksum})`);
                throw `Migration checksum mismatch`;
            }
            delete migrationsFsByVersion[migration.version];
        });
        let migrationsToApply = [];
        for (let name in migrationsFsByVersion) {
            migrationsToApply.push(migrationsFsByVersion[name]);
        }
        migrationsToApply = this.orderMigrations(migrationsToApply);
        return Promise.resolve(migrationsToApply);
    }
    async applyMigrations(migrations) {
        return Promise.all(migrations.map(mig => this.applyMigration(mig)));
    }
    async makeSureMigrationsAreUpToDate() {
        log.trace(`Starting Migration Check`);
        const migrationsDb = await this.loadMigrationsInDatabaseTable();
        const migrationsFs = await this.loadMigrationsInFileSystem();
        const migrationsToApply = await this.getMigrationsToBeApplied(migrationsDb, migrationsFs);
        await Promise.all(migrationsToApply.map(async (m) => await this.applyMigration(m)));
        const latestMigration = migrationsFs.length ? migrationsFs[migrationsFs.length - 1].version : 'None';
        log.info(`Migrations applied: ${migrationsToApply.length}; ` +
            `Migrations present: ${migrationsFs.length}; Latest: ${latestMigration}`);
        return Promise.resolve(this.dataSource);
    }
}
exports.MigrationManager = MigrationManager;
//# sourceMappingURL=MigrationManager.js.map