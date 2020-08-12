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
import {SqlGenerator} from "../SqlGenerator";
import {Logger} from "layer-logging";
import {SchemaOf} from "layer-validation";

const log = new Logger('sqlite');

export class SQLite implements DataSource{

    readonly driverName = 'sqlite';
    readonly db: Database;

    constructor(readonly path: string, callback?: () => void){
        this.db = new Database(path, callback);
    }

    private sqlOut(sql: string){
        if(process.env.MOTHER_SQL_OUT === 'yes') {
            log.debug(`[SQL] ${sql}`);
        }
    }

    getClosestType(type: DataColumnType): string {
        return type;
    }

    async insert<T>(data: T, schema: SchemaOf<T>, mapper: EntityMapper<T>): Promise<T> {
        const recordPersist: DataRecordPersist = createRecordPersist(data, schema, mapper);
        const generator = new SqlGenerator(this);
        const st = generator.insertStatement(recordPersist);

        this.sqlOut(st.sql);

        const queryResult = await this.queryRun(st.sql, st.values);
        return assignAutoIncrement(queryResult.lastID, data, mapper);
    }

    async update<T>(data: T, schema: SchemaOf<T>, mapper: EntityMapper<T>): Promise<void> {
        const recordPersist: DataRecordPersist = createRecordPersist(data, schema, mapper);
        const generator = new SqlGenerator(this);
        const st = generator.updateStatement(recordPersist);

        this.sqlOut(st.sql);

        await this.queryRun(st.sql, st.values);

        return Promise.resolve();
    }

    async delete<T>(data: T, schema: SchemaOf<T>, mapper: EntityMapper<T>): Promise<void> {
        return Promise.reject();
    }

    async createTable(table: DataTableDefinition): Promise<any> {
        const generator = new SqlGenerator(this);
        const statement = generator.createTableStatement(table);

        this.sqlOut(statement);

        return this.queriesRun(statement);
    }

    async getTableNames(): Promise<string[]>{
        return this.queryData(`SELECT name FROM sqlite_master WHERE type='table'`)
            .then(data => data.map(row => row.name));
    }

    async queriesRun(sql: string): Promise<Statement>{
        return new Promise<Statement>((resolve, reject) => {
            this.db.exec(sql, function (err) {
                if(err) {
                    reject(err);
                }else{
                    resolve(this);
                }
            })
        });
    }

    async queryRun(query: string, params: object | any[] = []): Promise<RunResult>{
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

    async queryData(query: string, params: object | any[] = []): Promise<any[]>{

        const data: any[] = [];

        return new Promise<any[]>((resolve, reject) => {

            this.db.each(query, params, function(err, row) {

                if(err) {
                    reject(err);
                }else{
                    data.push(row);
                }

            }, err => {
                if(err) {
                    reject(err);
                }else{
                    resolve(data);
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