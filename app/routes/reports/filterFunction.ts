import {ColumnFilterModel} from "~/db/model";

function validateColumnFilter(columnFilter:ColumnFilterModel,record:any){
    if(columnFilter.columnKey in record){
        const value:any = record[columnFilter.columnKey];
        const filterValue:any = columnFilter?.filterValue;

        const stringValue:string = value?.toString();
        const stringFilterValue:string = filterValue?.toString();
        switch (columnFilter.filterCondition) {
            case "equals":{
                return stringValue === stringFilterValue
            }
            case "contains": {
                return stringValue?.indexOf(stringFilterValue) != -1;
            }
            case "startsWith":{
                return stringValue?.startsWith(stringFilterValue);
            }
            case "endsWith":{
                return stringValue?.endsWith(stringFilterValue);
            }
            case "greaterThan":{

            }
            case "lessThan":{

            }
        }
    }
    return false;
}

export function filterFunction(columnFilters:Array<ColumnFilterModel>){
    return function runFilter(record:any){
        if((!columnFilters) || columnFilters.length === 0){
            return true;
        }
        const [colFil,...colFilters] = columnFilters;
        return colFilters.reduce((result:boolean,colFilter:ColumnFilterModel) => {
            if(colFilter.joinType === 'and'){
                return result && validateColumnFilter(colFilter,record)
            }else{
                return result || validateColumnFilter(colFilter,record)
            }
        },validateColumnFilter(colFil,record));
    }
}