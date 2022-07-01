import fs from "fs/promises";
import {join} from "path";
import type {DbModel} from "~/db/model";

let db: DbModel | undefined = undefined;
const dbDirectory = '.database';
const dbName = 'db.json';

export async function loadDb(): Promise<DbModel> {
    try {
        await fs.stat(dbDirectory);
    } catch (err) {
        console.log('Creating path now');
        await fs.mkdir(dbDirectory);
    }
    if (db === undefined) {
        try {
            const file = await fs.readFile(join(dbDirectory, dbName));
            db = JSON.parse(file.toString());
        } catch (err) {
            console.log('No File created yet');
            db = {};
        }
    }
    return db as DbModel;
}

export async function persistDb() {
    try {
        await fs.writeFile(join(dbDirectory, dbName), JSON.stringify(db));
    } catch (err) {
        console.error(err);
    }
}
