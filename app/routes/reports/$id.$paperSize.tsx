import {Horizontal, Vertical} from "react-hook-components";
import {useLoaderData, useLocation, useParams, useSearchParams} from "@remix-run/react";
import {Button} from "antd";
import {useContext, useEffect} from "react";
import {ThemeContext} from "~/components/Theme";
import type {LinksFunction, LoaderFunction} from "@remix-run/node";
import {json} from "@remix-run/node";
import {loadDb} from "~/db/db.server";
import type {ColumnModel, RendererModel, ReportModel} from "~/db/model";
import invariant from "tiny-invariant";
import {query} from "~/db/esnaad.server";
import {filterFunction} from "~/routes/reports/filterFunction";
import mapFunction from "~/routes/reports/mapFunction";
import paperCss from "~/components/paper.css";


export const links: LinksFunction = () => {
    return [
        {
            rel: "stylesheet",
            href: paperCss
        }
    ]
}

function PrintPanel() {
    const params = useParams();
    const location = useLocation();
    const {$theme} = useContext(ThemeContext);
    return <Vertical h={'100%'}>
        <Horizontal hAlign={'right'} p={10} style={{
            backgroundColor: $theme.current.panelBackgroundColor,
            zIndex: 1,
            boxShadow: '0 0 5px -2px rgba(0,0,0,0.3)'
        }}>
            <Button type={"primary"} onClick={_ => {
                // @ts-ignore
                const frame = window.frames['printFrame'];
                frame?.focus();
                frame?.print();
            }}>Print</Button>
        </Horizontal>
        <iframe title={'Print Frame'} id={'printFrame'} name={'printFrame'}
                src={location.pathname + '?paper=' + params.paperSize}
                style={{height: '100%'}}
                frameBorder={0}/>
    </Vertical>;
}

export default function ReportViewRoute() {
    const [searchParams] = useSearchParams();
    const paper = searchParams.get('paper');
    if (paper) {
        return <ReportPanel/>
    }
    return <PrintPanel/>
}

export const loader: LoaderFunction = async ({request, params}) => {
    const paper = new URL(request.url).searchParams.get('paper');
    if (!paper) {
        return null
    }
    const id = params.id;
    const db = await loadDb();
    const loaderData: ((ReportModel & { recordSet?: any[] }) | undefined) = db.reports?.find(r => r.id === id);
    invariant(loaderData, 'Report data cannot be empty');
    const dbQuery = db.queries?.find(q => q.id === loaderData.queryId);
    invariant(dbQuery, 'Query data cannot be empty');
    const {recordSet} = await query(dbQuery.sqlQuery);

    loaderData.recordSet = recordSet.map(mapFunction(dbQuery.columns, db.renderer || [])).filter(filterFunction(loaderData.columnFilters));
    const renderer: ((RendererModel | undefined)[] | undefined) = loaderData.columns.reduce((rendererIds: string[], column: ColumnModel) => {
        if (rendererIds.includes(column.rendererId)) {
            return rendererIds;
        }
        rendererIds.push(column.rendererId);
        return rendererIds;
    }, []).map(rendererId => db.renderer?.find(r => r.id === rendererId));

    // here we need to load the data
    return json({...loaderData, providers: {renderer}});
}

function printTable(loaderData: ((ReportModel & { recordSet?: any[] }) | undefined), pageCount: number) {
    return `<div style="display: flex;flex-direction: column;height: 100%;">
<section>Header</section>
<div id="print-page-${pageCount}" style="display: flex;flex-direction: column;flex-grow: 1">
    <table style="table-layout: fixed">
        <thead id="print-page-thead-${pageCount}">
            <tr>
                ${loaderData?.columns.filter(c => c.active).map(column => `<th style="width: ${column.width || ''};white-space: nowrap">${column.name}</th>`).join('')}
            </tr>
        </thead>
        <tbody id="print-page-tbody-${pageCount}"></tbody>
    </table>
</div>
<section>Footer</section>
</div>`;
}

function printPage(loaderData: any, pageCount: number, rowIndex: number) {
    const section = document.createElement('div');
    section.setAttribute('class', 'sheet');
    section.setAttribute('style', 'padding:0mm;page-break-after:always;break-after:page;');
    section.innerHTML = printTable(loaderData, pageCount);
    document.getElementById('print-page-root')?.appendChild(section);
    const container = document.getElementById(`print-page-${pageCount}`);
    const tbody = document.getElementById(`print-page-tbody-${pageCount}`);
    const thead = document.getElementById(`print-page-thead-${pageCount}`);
    const recordSet = loaderData?.recordSet || []
    const recordSetLength = recordSet.length;
    let containerHeight = (container?.getBoundingClientRect().height || 0) - (thead?.getBoundingClientRect().height || 0);
    for (let index = rowIndex; index < recordSetLength; index++) {
        const record = recordSet[index];
        const tr = document.createElement('tr');
        tr.setAttribute('id', 'print-page-tr-' + index)
        tr.innerHTML = loaderData?.columns.filter((c: ColumnModel) => c.active).map((column: ColumnModel) => {
            return `<td style="width: ${column.width || ''}">${record[column.key] ?? ''}</td>`
        }).join('') || '';
        tbody?.appendChild(tr);
        const persistedTr = document.getElementById('print-page-tr-' + index);
        const persistedTrHeight = persistedTr?.getBoundingClientRect().height || 0;
        containerHeight = containerHeight - persistedTrHeight;
        if (containerHeight < 0) {
            invariant(persistedTr, 'TR cannot be null');
            tbody?.removeChild(persistedTr);
            printPage(loaderData, pageCount + 1, index);
            return;
        }
    }
}

/*
body.A3.landscape { width: 420mm }
  body.A3, body.A4.landscape { width: 297mm }
  body.A4, body.A5.landscape { width: 210mm }
  body.A5                    { width: 148mm }
  body.letter, body.legal    { width: 216mm }
  body.letter.landscape      { width: 280mm }
  body.legal.landscape       { width: 357mm }
 */
function ReportPanel() {
    const loaderData = useLoaderData<((ReportModel & { recordSet?: any[] }) | undefined)>();
    useEffect(() => {
        printPage(loaderData, 0, 0);
    }, []);
    return <div id={'print-page-root'}/>
}



