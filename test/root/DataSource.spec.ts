import {assert} from "chai";
import {assignAutoIncrement, getMockDataSource, getSchemaDefinition, mapperToEntity} from "../../src/DataSource";
import {ThingEntity, ThingEntityMapper, ThingEntitySchema} from "../ThingEntity";
import {randomWord} from "../TestUtils";
import {SchemaOf} from "layer-validation";
import {PersonEntityMapper, PersonEntitySchema} from "../PersonEntity";

describe(`DataSource`, function () {

    it('should bypass an empty schema', function(){
        const schema: SchemaOf<ThingEntity> = {};
        const def = getSchemaDefinition(schema);

        assert.strictEqual(schema, def);
    });

    it('should bypass a schema with properties property', function(){
        const schema: SchemaOf<ThingEntity> = {
            properties: {
                something: {type: "string"}
            }
        };
        const def = getSchemaDefinition(schema);

        assert.strictEqual(schema, def);
    });

    it('should find definition on schema definitions', function(){
        const schema: SchemaOf<ThingEntity> = {
            '$ref': '#/definitions/Something',
            'definitions': {
                'Something': {
                    properties: {
                        something: {type: "string"}
                    }
                }
            }
        };
        const def = getSchemaDefinition(schema);

        assert.strictEqual(schema.definitions!.Something, def);
    });

    it('should reject schema without $ref', function(){
        const schema: SchemaOf<ThingEntity> = {
            'definitions': {
                'Something': {
                    properties: {
                        something: {type: "string"}
                    }
                }
            }
        };

        assert.throws(() => getSchemaDefinition(schema));
    });

    it('should reject schema without definitions', function(){
        const schema: SchemaOf<ThingEntity> = {
            '$ref': '#/definitions/Something',
        };

        assert.throws(() => getSchemaDefinition(schema));
    });

    it('should reject schema without definition', function(){
        const schema: SchemaOf<ThingEntity> = {
            '$ref': '#/definitions/Something',
            'definitions': {
                'Else': {
                    properties: {
                        something: {type: "string"}
                    }
                }
            }
        };

        assert.throws(() => getSchemaDefinition(schema));
    });

    it('should map entities with null ', function () {

        const data = {
            name: randomWord()
        };

        const t = mapperToEntity(data, ThingEntitySchema);

        assert.strictEqual(t.name, data.name);

    });

    it('should map entity with unspecified type', function () {
        const data = {
            name: randomWord()
        };

        const schema: SchemaOf<ThingEntity> = {
            properties: {
                name: {}
            }
        };

        const t = mapperToEntity(data, schema);

        assert.strictEqual(t.name, data.name);
    });

    it('should map entity with no properties', function () {
        const data = {
            name: randomWord()
        };

        const schema: SchemaOf<ThingEntity> = {};
        const t = mapperToEntity(data, schema);

        assert.strictEqual(t.name, data.name);
    });

    it('should handle field not in data', function () {
        const data = {
            something: randomWord()
        };

        const schema: SchemaOf<ThingEntity> = {

        };

        const t = mapperToEntity(data, schema);

        assert.strictEqual(typeof t.name, "undefined");
    });

    it('should map field is null', function () {
        const data = {
            name: null
        };

        const schema: SchemaOf<ThingEntity> = {
            properties:{
                name: {type: "string"}
            }
        };

        const t = mapperToEntity(data, schema);

        assert.strictEqual(t.name, undefined);
    });

    it('should map field is different type', function () {
        const data = {
            name: 0
        };

        const schema: SchemaOf<ThingEntity> = {
            properties:{
                name: {type: "string"}
            }
        };

        assert.throws(() => mapperToEntity(data, schema));
    });

    it('should skip autoincrement when there is ont one', function () {

        const data = {
            name: randomWord()
        };

        assert.doesNotThrow( () => assignAutoIncrement(null, data, ThingEntityMapper));

    });

    it('should emmit a mock DataSource', async function () {
        const mock = getMockDataSource();

        assert.strictEqual('TEXT', mock.getClosestType('TEXT'));

        assert.doesNotThrow(async () => await mock.createTable({
            name: randomWord(),
            columns: []
        }));

        assert.doesNotThrow(async () => await mock.insert(
            {name: randomWord()},
            PersonEntitySchema,
            PersonEntityMapper));

        assert.doesNotThrow(async () => await mock.update(
            {name: randomWord()},
            PersonEntitySchema,
            PersonEntityMapper));

        assert.doesNotThrow(async () => await mock.delete(
            {name: randomWord()},
            PersonEntitySchema,
            PersonEntityMapper));

        assert.doesNotThrow(async () => await mock.queryRun(
            randomWord(), []));

        assert.doesNotThrow(async () => await mock.queriesRun(
            randomWord()));

        assert.doesNotThrow(async () => await mock.queryData(
            randomWord(), []));

        assert.doesNotThrow(async () => await mock.queryEntity(
            ThingEntityMapper, randomWord(), []));
    });

});