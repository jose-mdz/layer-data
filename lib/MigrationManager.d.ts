import { DataSource, DataTableDefinition, EntityMapper } from "./DataSource";
import { SchemaOf } from "layer-validation";
export declare const MigrationTable: DataTableDefinition;
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
export declare const MigrationEntitySchema: SchemaOf<MigrationEntity>;
export declare const MigrationEntityMapper: EntityMapper<MigrationEntity>;
export interface MigrationConfig {
    schemaPath: string;
}
export declare class MigrationManager {
    readonly dataSource: DataSource;
    readonly appConfig: MigrationConfig;
    static migrationFromFile(filename: string, contents: string): MigrationUnit;
    constructor(dataSource: DataSource, appConfig: MigrationConfig);
    private migrationTablePresent;
    orderMigrations(migrations: MigrationUnit[]): MigrationUnit[];
    createMigrationTable(): Promise<void>;
    loadMigrationsInDatabaseTable(): Promise<MigrationUnit[]>;
    loadMigrationsInFileSystem(): Promise<MigrationUnit[]>;
    applyMigration(migration: MigrationUnit): Promise<void>;
    compareMigrations(migrationsDb: MigrationUnit[], migrationsFs: MigrationUnit[]): Promise<MigrationUnit[]>;
    applyMigrations(migrations: MigrationUnit[]): Promise<void[]>;
    makeSureMigrationsAreUpToDate(): Promise<DataSource>;
}
