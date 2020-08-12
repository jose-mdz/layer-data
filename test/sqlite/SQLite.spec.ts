import {assert} from 'chai';
import {SQLite} from "../../src/sqlite/SQLite";
import * as fs from "fs";

describe(`sqlite/SQLite`, function () {

    function randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    function randomChar() {
        return Math.random() > 0.5 ? String.fromCharCode(randomInt(65, 90)) : String.fromCharCode(randomInt(97, 122));
    }

    function randomWord(length: number = 10) {
        return new Array(length).fill('').map(c => randomChar()).join('');
    }

    function times(n: number, callback: (i: number) => void): any[] {

        if(isNaN(n) || !isFinite(n) || n <= 0) {
            return [];
        }

        const result: any[] = [];

        for(let i = 0; i < n; i++){
            result.push(callback(i));
        }

        return result;
    }

    before(function () {


    });

    it('should create a database', function () {
        const file = `${randomWord()}.db`;

        return new Promise(((resolve) => {
            new SQLite(file, () => {
                assert.isTrue(fs.existsSync(file));
                fs.unlinkSync(file);
                resolve();
            });
        }));
    });

});