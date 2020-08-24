import {SchemaOf} from "layer-validation";
import {EntityMapper} from "../src/DataSource";

export interface ThingEntity {
    name: string;
}

export const ThingEntitySchema: SchemaOf<ThingEntity> = {
    properties: {
        "name": {type: ["string", "null"]}
    }
};

export const ThingEntityMapper: EntityMapper<ThingEntity> = {
    table: "thing",
    primaryKey: "id",
};