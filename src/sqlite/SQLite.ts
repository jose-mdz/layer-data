import {Database, RunResult, Statement} from "sqlite3";
import {
    assignAutoIncrement,
    createRecordPersist,
    DataColumnType,
    DataRecordPersist,
    DataSource,
    DataTableDefinition,
    EntityMapper, mapperToEntity
} from "../DataSource";
import {Logger} from "layer-logging";
import {SchemaOf} from "layer-validation";
import {SQLiteSqlGenerator} from "./SQLiteSqlGenerator";

const log = new Logger('sqlite');

export interface SQLiteConfig{
    callback?: () => void;
    echoSQL?: boolean;
    echoErrorSQL?: boolean;
}

export class SQLite implements DataSource{

    readonly driverName = 'sqlite';
    readonly db: Database;
    readonly sqlGenerator: SQLiteSqlGenerator;

    constructor(readonly path: string, readonly config: SQLiteConfig = {}){
        this.db = new Database(path, config.callback);
        this.sqlGenerator = new SQLiteSqlGenerator(this);
    }

    private sqlOut(sql: string){
        if(this.config.echoSQL === true) {
            log.trace(`[SQL] ${sql}`);
        }
    }

    private sqlOutError(sql: string){
        if(this.config.echoErrorSQL === true) {
            log.error(`[FAILED] [SQL] ${sql}`);
        }
    }

    getClosestType(type: DataColumnType): string {
        return type;
    }

    async insert<T>(data: T, schema: SchemaOf<T>, mapper: EntityMapper<T>): Promise<T> {
        const recordPersist: DataRecordPersist = createRecordPersist(data, schema, mapper);
        const generator = this.sqlGenerator;
        const st = generator.insertStatement(recordPersist);

        const queryResult = await this.queryRun(st.sql, st.values);
        return assignAutoIncrement(queryResult.lastID, data, mapper);
    }

    async update<T>(data: T, schema: SchemaOf<T>, mapper: EntityMapper<T>): Promise<void> {
        const recordPersist: DataRecordPersist = createRecordPersist(data, schema, mapper);
        const generator = this.sqlGenerator;
        const st = generator.updateStatement(recordPersist);

        await this.queryRun(st.sql, st.values);
    }

    async delete<T>(data: T, schema: SchemaOf<T>, mapper: EntityMapper<T>): Promise<void> {
        const recordPersist: DataRecordPersist = createRecordPersist(data, schema, mapper);
        const generator = this.sqlGenerator;
        const st = generator.deleteStatement(recordPersist);

        await this.queryRun(st.sql, st.values);
    }

    async createTable(table: DataTableDefinition): Promise<any> {
        const generator = this.sqlGenerator;
        const statement = generator.createTableStatement(table);

        return this.queriesRun(statement);
    }

    async getTableNames(): Promise<string[]>{
        return this.queryData(`SELECT name FROM sqlite_master WHERE type='table'`)
            .then(data => data.map(row => row.name));
    }

    async queriesRun(sql: string): Promise<void>{
        return new Promise<void>((resolve, reject) => {

            this.sqlOut(sql);

            this.db.exec(sql, err => {
                if(err) {
                    this.sqlOutError(sql);
                    reject(err);
                }else{
                    resolve();
                }
            })
        });
    }

    private run(query: string, params: object | any[]): Promise<RunResult>{
        return new Promise<RunResult>((resolve, reject) => {
            this.db.run(query, params, function(err: any) {
                if(err) {
                    reject(err);
                }else{
                    resolve(this);
                }
            })
        });
    }

    async queryRun(query: string, params: object | any[] = []): Promise<RunResult>{
        try{
            this.sqlOut(query);
            return await this.run(query, params);
        }catch(e){
            this.sqlOutError(query);
            return Promise.reject(e);
        }
    }

    async queryData(query: string, params: object | any[] = []): Promise<any[]>{

        return new Promise<any[]>((resolve, reject) => {

            this.sqlOut(query);

            this.db.all(query, params, (err, rows) => {
                if(err) {
                    this.sqlOutError(query);
                    reject(err);
                }else{
                    resolve(rows);
                }
            });
        });

    }

    async queryEntity<T>(schema: SchemaOf<T>, query: string, params: object | any[] = []): Promise<T[]>{

        try{
            const data = await this.queryData(query, params);

            return Promise.resolve(data.map( e => mapperToEntity(e, schema)));
        }catch(e){
            return Promise.reject(e);
        }


    }

}