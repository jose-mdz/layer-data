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
exports.MigrationManager = exports.MigrationEntityMapper = exports.MigrationEntitySchema = exports.MigrationTable = void 0;
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
class MigrationManager {
    constructor(dataSource, appConfig) {
        this.dataSource = dataSource;
        this.appConfig = appConfig;
    }
    static migrationFromFile(filename, contents) {
        if (!filename.endsWith('.sql')) {
            log.error(`Migration file name must end with .sql`);
            throw 'Invalid migration file name';
        }
        const cleanName = path.basename(filename, '.sql');
        const parts = cleanName.split('__');
        if (parts.length != 2 || !parts[0] || !parts[1]) {
            log.error(`Invalid migration file name: ${filename}. File pattern: VERSION__NAME.sql`);
            throw 'Invalid migration file name';
        }
        const version = parts[0];
        const name = parts[1].replace(/\_/g, ' ');
        const shaSum = crypto.createHash('sha1');
        shaSum.update(filename);
        shaSum.update(contents);
        const checksum = shaSum.digest('hex');
        return { name, version, contents, checksum };
    }
    migrationTablePresent() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dataSource.getTableNames()
                .then(tables => tables.indexOf(exports.MigrationTable.name) >= 0);
        });
    }
    orderMigrations(migrations) {
        return migrations.sort((a, b) => a.version.localeCompare(b.version));
    }
    createMigrationTable() {
        return __awaiter(this, void 0, void 0, function* () {
            log.trace(`Migration table will be created`);
            return this.dataSource.createTable(exports.MigrationTable);
        });
    }
    loadMigrationsInDatabaseTable() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(yield this.migrationTablePresent())) {
                yield this.createMigrationTable();
            }
            try {
                const migrationEntities = yield this.dataSource.queryEntity(exports.MigrationEntitySchema, `SELECT * FROM ${exports.MigrationTable.name} ORDER BY version`, []);
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
        });
    }
    loadMigrationsInFileSystem() {
        return __awaiter(this, void 0, void 0, function* () {
            const migrationsPath = path.join(this.appConfig.schemaPath, this.dataSource.driverName);
            if (!fs.existsSync(migrationsPath)) {
                log.error(`The migrations folder was not found: ${migrationsPath}`);
                return Promise.reject();
            }
            const dir = fs.readdirSync(migrationsPath);
            const migrations = dir
                .filter(file => file.toLowerCase().endsWith('.sql'))
                .map(file => MigrationManager.migrationFromFile(file, fs.readFileSync(path.join(migrationsPath, file), 'utf-8')));
            return Promise.resolve(this.orderMigrations(migrations));
        });
    }
    applyMigration(migration) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                log.info(`Applying migration: (${migration.version}) ${migration.name}`);
                yield this.dataSource.queriesRun(migration.contents);
                yield this.dataSource.insert({
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
        });
    }
    compareMigrations(migrationsDb, migrationsFs) {
        return __awaiter(this, void 0, void 0, function* () {
            if (migrationsDb.length > migrationsFs.length) {
                log.error(`There are more migrations in the database that there are in the file system. Aborting.`);
                throw `Mismatch of versions comparing database vs file system.`;
            }
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
        });
    }
    applyMigrations(migrations) {
        return __awaiter(this, void 0, void 0, function* () {
            return Promise.all(migrations.map(mig => this.applyMigration(mig)));
        });
    }
    makeSureMigrationsAreUpToDate() {
        return __awaiter(this, void 0, void 0, function* () {
            log.trace(`Starting Migration Check`);
            const migrationsDb = yield this.loadMigrationsInDatabaseTable();
            const migrationsFs = yield this.loadMigrationsInFileSystem();
            const migrationsToApply = yield this.compareMigrations(migrationsDb, migrationsFs);
            yield Promise.all(migrationsToApply.map((m) => __awaiter(this, void 0, void 0, function* () { return yield this.applyMigration(m); })));
            const latestMigration = migrationsFs.length ? migrationsFs[migrationsFs.length - 1].version : 'None';
            log.info(`Migrations applied: ${migrationsToApply.length}; ` +
                `Migrations present: ${migrationsFs.length}; Latest: ${latestMigration}`);
            return Promise.resolve(this.dataSource);
        });
    }
}
exports.MigrationManager = MigrationManager;
//# sourceMappingURL=MigrationManager.js.map