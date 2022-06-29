export interface DbModel {
    renderer?: Array<RendererModel>,
    queries?:Array<QueryModel>
}

export interface RendererModel {
    id: string,
    name: string,
    description: string,
    rendererFunction: string
}

export interface QueryModel{
    id:string,
    name: string,
    description: string,
    sqlQuery: string,
    columns: Array<ColumnModel>
}

export interface ColumnModel{
    key: string,
    type: string,
    name: string,
    rendererId: string, // this is the reference to RendererModel
    enabled: boolean
}