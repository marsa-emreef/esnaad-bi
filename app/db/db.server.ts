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
            await seedDb();
        } catch (err) {
            console.log('No File created yet');
            db = {};
            await seedDb();
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

async function seedDb() {
    const renderers = db?.renderer || [];
    //'boolean' | 'number' | 'string' | 'date' | 'buffer' | 'object' | 'null' | 'any'
    if (!renderers.find(r => r.id === 'DefaultBooleanRenderer')) {
        renderers.push({
            id: 'DefaultBooleanRenderer',
            description: 'Default renderer for boolean, returns Yes / No',
            name: 'Boolean Renderer',
            rendererFunction: `(cellData,rowData,rowIndex,gridData,columnKey,columnName,context) => cellData ? 'YES' : 'NO'`,
            typeOf: 'boolean'
        });
    }
    if (!renderers.find(r => r.id === 'DefaultNumberRenderer')) {
        renderers.push({
            id: 'DefaultNumberRenderer',
            description: 'Default number renderer, returns comma separator',
            name: 'Number Renderer',
            rendererFunction: `(cellData,rowData,rowIndex,gridData,columnKey,columnName,context) => cellData?.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",")`,
            typeOf: 'number'
        });
    }

    if (!renderers.find(r => r.id === 'DefaultStringRenderer')) {
        renderers.push({
            id: 'DefaultStringRenderer',
            description: 'Default string renderer, return as is',
            name: 'String Renderer',
            rendererFunction: `(cellData,rowData,rowIndex,gridData,columnKey,columnName,context) => cellData`,
            typeOf: 'string'
        });
    }

    if (!renderers.find(r => r.id === 'DefaultDateRenderer')) {
        renderers.push({
            id: 'DefaultDateRenderer',
            description: 'Default date renderer',
            name: 'DD-MMM-YYYY Renderer',
            rendererFunction: `(cellData,rowData,rowIndex,gridData,columnKey,columnName,context) => cellData?.toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'}).replace(/ /g, '-').toUpperCase()`,
            typeOf: 'date'
        });
    }
    if (!renderers.find(r => r.id === 'DefaultDateTimeRenderer')) {
        renderers.push({
            id: 'DefaultDateTimeRenderer',
            description: 'Default date renderer',
            name: 'DD-MMM-YYYY HH:MM Renderer',
            rendererFunction: `(cellData,rowData,rowIndex,gridData,columnKey,columnName,context) => date.toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'}).replace(/ /g, '-').toUpperCase() + ' ' + date.toLocaleDateString('en-GB', {hour:'numeric',minute:'numeric',hourCycle:'h23'}).split(' ')[1]`,
            typeOf: 'date'
        })
    }

}
