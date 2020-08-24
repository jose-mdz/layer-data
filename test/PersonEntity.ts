import {SchemaOf} from "layer-validation";
import {DataSource, EntityMapper} from "../src/DataSource";
import {EntityRepository} from "../src/EntityRepository";

export interface PersonEntity{
    id: number;
    name: string;
}

export const PersonEntitySchema: SchemaOf<PersonEntity> = {
    properties:{
        "id": {type: "number"},
        "name": {type: "string"},
    },
    required: ["id", "name"]
};

export const PersonEntityMapper: EntityMapper<PersonEntity> = {
    table: "person",
    primaryKey: "id",
    autoIncrement: "id"
};

export class PersonRepo extends EntityRepository<PersonEntity>{
    constructor(readonly db: DataSource){
        super(db, PersonEntitySchema, PersonEntityMapper);
    }
}