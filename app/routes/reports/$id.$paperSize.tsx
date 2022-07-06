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
    return `<div style="display: flex;flex-direction: column;height: 100%;font-size: 12px;line-height: 13px">
<div style="background-color: rgba(0,0,0,0.05);padding: 10px;-webkit-print-color-adjust: exact; ">
<div style="font-size: 18px;text-align: center">${loaderData?.name}</div>
</div>

<div id="print-page-${pageCount}" style="display: flex;flex-direction: column;flex-grow: 1">
    <div style="display: flex;flex-direction: column">
        <div id="print-page-thead-${pageCount}" style="display: flex;flex-direction: row;font-weight: bold;border-bottom: 1px solid lightgray;background-color: #444;color: #fff;-webkit-print-color-adjust: exact; ">
            ${loaderData?.columns.filter(c => c.active).map(column => `<div style="width: ${column.width || '0'}%;flex-shrink: 0;flex-grow: 0;padding: 5px 3px">${column.name}</div>`).join('')}
        </div>
        <div id="print-page-tbody-${pageCount}">
        
        </div>
    </div>
</div>
<div style="background-color: lightgray;padding: 5px;-webkit-print-color-adjust: exact; ">
    <div style="display: flex">
        <div style="flex-grow: 1;display: flex;align-items: center">
            
        </div>
        <div>Page #${pageCount + 1}</div>
    </div>
    
</div>
</div>`;
}

function printPage(loaderData: LoaderData, pageCount: number, rowIndex: number) {
    const section = document.createElement('div');
    section.setAttribute('class', 'sheet');
    section.setAttribute('style', `padding:${loaderData?.padding}mm;page-break-after:always;break-after:page;`);
    section.innerHTML = printTable(loaderData, pageCount);
    document.getElementById('print-page-root')?.appendChild(section);
    const container = document.getElementById(`print-page-${pageCount}`);
    const tableBody = document.getElementById(`print-page-tbody-${pageCount}`);
    const tableHead = document.getElementById(`print-page-thead-${pageCount}`);
    const recordSet = loaderData?.recordSet || []
    const recordSetLength = recordSet.length;
    let containerHeight = (container?.getBoundingClientRect().height || 0) - (tableHead?.getBoundingClientRect().height || 0);
    for (let index = rowIndex; index < recordSetLength; index++) {
        const record = recordSet[index];
        const rowElementDraft = document.createElement('div');
        rowElementDraft.setAttribute('id', 'print-page-tr-' + index);
        rowElementDraft.setAttribute('style', 'display:flex;width:100%;border-bottom:1px solid lightgray;');
        rowElementDraft.innerHTML = loaderData?.columns.filter((c: ColumnModel) => c.active).map((column: ColumnModel, colIndex) => {
            return `<div style="width: ${column.width || ''}%;flex-shrink: 0;flex-grow: 0;border-right: 1px solid lightgray;padding:3px;border-left: ${colIndex === 0 ? '1px solid lightgrey' : ''}">${record[column.key] ?? ''}</div>`
            // return `<div style="width: ${column.width || ''}mm;flex-shrink: 0;flex-grow: 0;text-overflow: ellipsis;overflow: hidden;border-right: 1px solid lightgray;padding:3px;border-left: ${colIndex === 0 ? '1px solid lightgrey' : ''}">${record[column.key] ?? ''}</div>`
        }).join('') || '';
        tableBody?.appendChild(rowElementDraft);
        const rowElement = document.getElementById('print-page-tr-' + index);
        const rowElementHeight = rowElement?.getBoundingClientRect().height || 0;
        containerHeight = containerHeight - rowElementHeight;

        if (containerHeight < 0) {
            invariant(rowElement, 'TR cannot be null');
            tableBody?.removeChild(rowElement);
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
    const loaderData = useLoaderData<LoaderData>();
    useEffect(() => {
        printPage(loaderData, 0, 0);
    }, []);
    return <div id={'print-page-root'}/>
}

type LoaderData = ((ReportModel & { recordSet?: any[] }) | undefined);

