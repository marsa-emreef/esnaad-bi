import type {ColumnModel, RendererModel} from "~/db/model";

export default function mapFunction(columns: ColumnModel[], renderers: RendererModel[]) {
    return (recordData: any, recordIndex: any, source: any[]) => {
        const mappedModel: any = {};
        for (const col of columns) {

            if (!col.enabled) {
                continue;
            }
            const cellValue = recordData[col.key];
            const renderer = renderers.find(r => r.id === col.rendererId);
            const rendererFunction = renderer?.rendererFunction || '(value) => value';
            // eslint-disable-next-line no-new-func
            const F = new Function(`return (${rendererFunction})(...arguments)`);
            mappedModel[col.key] = F.apply(null, [cellValue, recordData, recordIndex, source, col.key, col.name, {}]);
        }
        return mappedModel;
    }
}