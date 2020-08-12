"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
class EntityRepository {
    constructor(dataSource, schema, entityMapper) {
        this.dataSource = dataSource;
        this.schema = schema;
        this.entityMapper = entityMapper;
    }
    getAll() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dataSource.queryEntity(this.schema, `SELECT * FROM ${this.entityMapper.table}`, []);
        });
    }
    getOne(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.dataSource.queryEntity(this.schema, `
            SELECT * 
            FROM ${this.entityMapper.table} 
            WHERE ${this.entityMapper.primaryKey} = ?`, [id]))[0];
        });
    }
    insert(item) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dataSource.insert(item, this.schema, this.entityMapper);
        });
    }
    update(item) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dataSource.update(item, this.schema, this.entityMapper);
        });
    }
    delete(item) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dataSource.delete(item, this.schema, this.entityMapper);
        });
    }
    deleteAll() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dataSource.queryRun(`DELETE FROM ${this.entityMapper.table}`, []);
        });
    }
}
exports.EntityRepository = EntityRepository;
//# sourceMappingURL=EntityRepository.js.map