import { DataSource, EntityMapper } from "./DataSource";
import { SchemaOf } from "layer-validation";
export declare class EntityRepository<T> {
    readonly dataSource: DataSource;
    readonly schema: SchemaOf<T>;
    readonly entityMapper: EntityMapper<T>;
    constructor(dataSource: DataSource, schema: SchemaOf<T>, entityMapper: EntityMapper<T>);
    getAll(): Promise<T[]>;
    getOne(id: number): Promise<T>;
    insert(item: T): Promise<T>;
    update(item: T): Promise<void>;
    delete(item: T): Promise<void>;
    deleteAll(): Promise<void>;
}
