"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityRepository = void 0;
class EntityRepository {
    constructor(dataSource, schema, entityMapper) {
        this.dataSource = dataSource;
        this.schema = schema;
        this.entityMapper = entityMapper;
    }
    async getAll() {
        return this.dataSource.queryEntity(this.schema, `SELECT * FROM ${this.entityMapper.table}`, []);
    }
    async getOne(id) {
        return (await this.dataSource.queryEntity(this.schema, `
            SELECT * 
            FROM ${this.entityMapper.table} 
            WHERE ${this.entityMapper.primaryKey} = ?`, [id]))[0];
    }
    async insert(item) {
        return this.dataSource.insert(item, this.schema, this.entityMapper);
    }
    async update(item) {
        return this.dataSource.update(item, this.schema, this.entityMapper);
    }
    async delete(item) {
        return this.dataSource.delete(item, this.schema, this.entityMapper);
    }
    async deleteAll() {
        return this.dataSource.queryRun(`DELETE FROM ${this.entityMapper.table}`, []);
    }
}
exports.EntityRepository = EntityRepository;
//# sourceMappingURL=EntityRepository.js.map