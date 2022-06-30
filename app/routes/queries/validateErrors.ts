import {ColumnModel, QueryModel} from "~/db/DbModel";

export function validateErrors(state: QueryModel) {
    const errors: QueryModel = {id: '', sqlQuery: '', name: '', description: '', columns: []};
    if (!state.name) {
        errors.name = 'Name is Required';
    }
    if (!state.sqlQuery) {
        errors.sqlQuery = 'SQL Query is required';
    }
    state.columns.forEach(col => {
        const colError: ColumnModel = {name: '', enabled: false, rendererId: '', key: '', type: ''};
        if (col.enabled) {
            if (!col.name) {
                colError.name = 'Name is required';
            }
            if (!col.rendererId) {
                colError.rendererId = 'Render is required'
            }
        }
        const hasErrors = Object.entries(colError).some(([, value]) => value);
        if (hasErrors) {
            colError.key = col.key;
            errors.columns.push(colError);
        }
    })
    const hasErrors = Object.entries(errors).some(([, value]) => {
        if (Array.isArray(value)) {
            return value.length > 0
        }
        return value;
    });
    return {errors,hasErrors};
}