import type {ConnectionPool} from "mssql";
import sql from "mssql";

const sqlConfig = {
    user: "esnaadbi",
    password: "p@ssw0rd",
    database: "esnaadTest",
    server: 'localhost',
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: true, // for azure
        trustServerCertificate: true // change to true for local dev / self-signed certs
    }
}

let pool: ConnectionPool;

export type QueryResult = {
    columns: Array<{ key: string, type: string }>,
    recordSet: Array<any>
}

export async function query(query: string): Promise<QueryResult> {
    if (!pool) {
        pool = await sql.connect(sqlConfig)
    }
    const {recordset} = await sql.query(query);
    const columns = Object.keys(recordset.columns).map((key: string) => {
        const type = recordset.columns[key].type;
        return {
            key: key,
            // @ts-ignore
            type: type.name
        }
    });

    return {columns: columns, recordSet: recordset};
}
