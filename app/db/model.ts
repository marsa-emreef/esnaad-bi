export interface DbModel {
    renderer?: Array<RendererModel>,
    queries?: Array<QueryModel>,
    reports?: Array<ReportModel>
}

export interface RendererModel {
    id: string,
    name: string,
    description: string,
    rendererFunction: string,
    typeOf: 'boolean' | 'number' | 'string' | 'date' | 'buffer' | 'object' | 'null' | 'any'
}

export interface QueryModel {
    id: string,
    name: string,
    description: string,
    sqlQuery: string,
    columns: Array<ColumnModel>
}

export interface ColumnModel {
    key: string,
    type: string,
    name: string,
    rendererId: string, // this is the reference to RendererModel
    enabled: boolean,
    active: boolean,
    width: number
}

// THIS IS REPORT MODEL
export interface ReportModel {
    id: string,
    name: string,
    description: string,
    queryId: string,
    securityCode: string[], // ADM.001.02.03.04
    columns: Array<ColumnModel>,
    columnFilters: Array<ColumnFilterModel>,
    paperSize : 'A5' | 'A4' | 'A3' | 'Letter' | 'Legal',
    isLandscape : boolean,
    padding : number
}

export interface ColumnFilterModel extends ColumnFilterGroupModel {
    columnKey: string,
    filterValue: string | string[],
    filterCondition: 'contains' | 'startsWith' | 'endsWith' | 'equals' | 'greaterThan' | 'lessThan'
}

export interface ColumnFilterGroupModel {
    id: string,
    joinType: 'and' | 'or'
    children: ColumnFilterModel[]
}