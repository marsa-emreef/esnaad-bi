import invariant from "tiny-invariant";
import {Vertical} from "react-hook-components";
import {ColumnModel, RendererModel} from "~/db/model";

export default function mapFunction(columns:ColumnModel[],renderers:RendererModel[]){
    return (recordData:any,recordIndex:any,source:any[]) => {
        const mappedModel:any = {};
        for (const col of columns) {

            if(!col.enabled){
                continue;
            }
            const cellValue = recordData[col.key];
            const renderer = renderers.find(r => r.id === col.rendererId);
            const rendererFunction = renderer?.rendererFunction || '(value) => value';
            const F = new Function(`return (${rendererFunction})(...arguments)`);
            const result = F.apply(null,[cellValue,recordData,recordIndex,source,col.key,col.name,{}]);
            mappedModel[col.key] = result;
        }
        return mappedModel;
    }
}