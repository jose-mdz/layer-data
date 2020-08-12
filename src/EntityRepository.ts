import {DataSource, EntityMapper} from "./DataSource";
import {SchemaOf} from "layer-validation";

export class EntityRepository<T>{

    constructor(
        readonly dataSource: DataSource,
        readonly schema: SchemaOf<T>,
        readonly entityMapper: EntityMapper<T>) {}

    async getAll(): Promise<T[]>{
        return this.dataSource.queryEntity(this.schema,
            `SELECT * FROM ${this.entityMapper.table}`, []);
    }

    async getOne(id: number): Promise<T>{
        return (await this.dataSource.queryEntity(this.schema, `
            SELECT * 
            FROM ${this.entityMapper.table} 
            WHERE ${this.entityMapper.primaryKey} = ?`,
            [id]))[0];
    }

    async insert(item: T): Promise<T>{
        return this.dataSource.insert(item, this.schema, this.entityMapper);
    }

    async update(item: T): Promise<void>{
        return this.dataSource.update(item, this.schema, this.entityMapper);
    }

    async delete(item: T): Promise<void>{
        return this.dataSource.delete(item, this.schema, this.entityMapper);
    }

    async deleteAll(): Promise<void>{
        return this.dataSource.queryRun(`DELETE FROM ${this.entityMapper.table}`, []);
    }
}