# layer-data
Multi-data source data layer for apps.

[![npm](https://img.shields.io/npm/v/layer-data.svg)](https://www.npmjs.com/package/layer-data)
[![Build Status](https://travis-ci.org/menendezpoo/layer-data.svg?branch=master)](https://travis-ci.org/menendezpoo/layer-data)
[![Coverage Status](https://coveralls.io/repos/github/menendezpoo/layer-data/badge.svg?branch=master)](https://coveralls.io/github/menendezpoo/layer-data?branch=master)

# Basics

Initialize a SQLite database

```typescript
// Path of the database file
const db_path = 'data/my-data.db';

// Initialize database
const db = new SQLite(db_path);

// Retrieve a "Hello World"
const data = await db.queryData(`SELECT 'Hello World'`);

// Prints "Hello World"
console.log(data[0]);
```

# Object-Relational Mapping
Aims to be not too complex, just useful enough. 

## Define Entity, Schema, Mapper and Repo
```typescript
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
```

## Basic Use Cases

Initialize:
```typescript
// Initialize DB
const db = new SQLite('my-data.db');

// Initialize Repo
const repo = new PersonRepo(db);

```

### Insert an Entity
```typescript
const person  = repo.insert({id: 0, name: "John Doe"});

// Prints 1, since id is auto-increment
console.log(person.id);
```

### Retrieve an Entity
```typescript
const person = repo.getOne(1);

// Prints "John Doe"
console.log(person.name);
```

### Update an Entity
```typescript
person.name = 'John Smith';

// Updates on DB
repo.update(person);
```

### Delete an Entity
```typescript
repo.delete(person);

const person = repo.getOne(1);

// person is undefined
```

# Migrations Support
Migrations are loaded from a directory on a flat structure of `.sql` files.

Basic rules:
 - Migrations must be `.sql` files
 - Migrations need a version identifier
 - Double underscore `__` separates version from migration name
 - Migrations should not change once applied
 - Migrations are persisted in a database table called `schema_migration`
 - It only takes one line to initialize the migrations support:
 ```typescript
    migrationManager.makeSureMigrationsAreUpToDate();
```

Example directory:
```
/data
  V1__Base_Schema.sql
  V2__Add_Table_Product.sql
  V3__Add_Column_Price.sql
```

Typical Initialization:
```typescript
 // Initialize DB
 const db = new SQLite('my-data.db');

// Path to folder where migrations are contained
schemaPath = 'data/migrations/sqlite';

// Initialize MigrationManager
MigrationManager mm = new MigrationManager(db, {schemaPath});

// Run migration manager
mm.makeSureMigrationsAreUpToDate();
```

