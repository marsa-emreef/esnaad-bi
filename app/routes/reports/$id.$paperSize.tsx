import {Horizontal, Vertical} from "react-hook-components";
import {useLoaderData, useLocation, useParams, useSearchParams} from "@remix-run/react";
import {Button} from "antd";
import type {Dispatch, MutableRefObject, ReactElement, SetStateAction} from "react";
import {memo, useContext, useEffect, useRef, useState} from "react";
import {ThemeContext} from "~/components/Theme";
import PaperSheet from "~/components/PaperSheet";
import type { LoaderFunction} from "@remix-run/node";
import {json} from "@remix-run/node";
import {loadDb} from "~/db/db.server";
import type {ColumnModel, RendererModel, ReportModel} from "~/db/model";
import invariant from "tiny-invariant";
import {query} from "~/db/esnaad.server";
import {filterFunction} from "~/routes/reports/filterFunction";
import mapFunction from "~/routes/reports/mapFunction";


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
            <Button type={"primary"}  onClick={_ => {
                // @ts-ignore
                const frame = window.frames['printFrame'];
                frame?.focus();
                frame?.print();
            }}>Print</Button>
        </Horizontal>
        <iframe title={'Print Frame'} id={'printFrame'} name={'printFrame'} src={location.pathname + '?paper=' + params.paperSize}
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

    loaderData.recordSet = recordSet.map(mapFunction(dbQuery.columns,db.renderer||[])).filter(filterFunction(loaderData.columnFilters));
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
    const [panels, setPanels] = useState<ReactElement[]>([]);

    useEffect(() => {
        setPanels(oldPanel => {
            const panel = <SheetRenderer index={0} setPanels={setPanels} loaderData={loaderData}/>
            return [...oldPanel, panel];
        });
    }, []);
    return <>
        {panels.map((panel, index) => {
            return <Vertical key={index}>
                {panel}
            </Vertical>;
        })}

    </>
}

const RowRenderer = memo(function RowRenderer(props: { loaderData: LoaderData, index: number, rowContainerRemainingHeightRef: MutableRefObject<number>, setRows: Dispatch<SetStateAction<any>>, setPanels: SetPanels }) {
    const {index,setPanels,setRows,rowContainerRemainingHeightRef,loaderData} = props;
    const recordSet:any[]|undefined = loaderData?.recordSet;
    invariant(recordSet,'RecordSet cannot be null');
    const rowData: any = recordSet[index];
    invariant(rowData,'RowData cannot be null');
    const rowRef = useRef<HTMLDivElement>(null);
    const recordSetLength = recordSet.length;
    useEffect(() => {
        const rowHeight = rowRef?.current?.getBoundingClientRect().height || 0;
        if (rowHeight > rowContainerRemainingHeightRef.current) {
            // we need to hide this !
            setRows((oldRows: any[]) => {
                return oldRows.filter((value, idx) => idx < (oldRows.length - 1) )
            });
            setPanels(oldPanel => {
                const panel = <SheetRenderer index={index} setPanels={setPanels} loaderData={loaderData}/>
                return [...oldPanel, panel];
            });
        } else {
            rowContainerRemainingHeightRef.current -= rowHeight;
            const nextIndex = index + 1;
            if(nextIndex < recordSetLength){
                setRows((oldRows: any[]) => {
                    return [...oldRows, <RowRenderer loaderData={loaderData} index={nextIndex}
                                                     rowContainerRemainingHeightRef={rowContainerRemainingHeightRef}
                                                     setRows={setRows} setPanels={setPanels} key={index}/>];
                });
            }

        }
    }, []);
    return <Horizontal ref={rowRef} style={{borderBottom:'1px solid rgba(0,0,0,0.3)'}}>
        {loaderData?.columns?.map(col => <Vertical key={col.key} style={{
            width: `calc(100% / ${loaderData?.columns?.length})`,
            flexShrink: 0,
            overflow:'hidden'
        }} dangerouslySetInnerHTML={{__html:rowData[col.key]}}/>)}
    </Horizontal>;
});

type LoaderData = (ReportModel & { recordSet?: any[] }) | undefined;
type SetPanels = (value: (((prevState: ReactElement[]) => ReactElement[]) | ReactElement[])) => void;

function SheetRenderer(props: { loaderData: LoaderData, index: number, setPanels: SetPanels }) {
    const {loaderData, setPanels, index} = props;
    const [rows, setRows] = useState<ReactElement[]>([]);
    const rowContainerRemainingHeightRef = useRef(0);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        rowContainerRemainingHeightRef.current = containerRef.current?.getBoundingClientRect().height || 0;
        if(loaderData?.recordSet?.length){
            setRows([<RowRenderer loaderData={loaderData} index={index}
                                  rowContainerRemainingHeightRef={rowContainerRemainingHeightRef} setRows={setRows}
                                  setPanels={setPanels} key={index}/>])
        }

    }, []);

    return <PaperSheet padding={'5mm'}>
        <Vertical style={{height: '100%',fontSize:'10px'}}>
            <Vertical hAlign={'center'}>
                THIS WILL BE THE HEADER
            </Vertical>
            <Vertical style={{borderBottom:'1px solid rgba(0,0,0,0.3)'}}>
                <Horizontal>
                    {loaderData?.columns.map(column => {
                        return <Vertical key={column.key} style={{
                            width: `calc(100% / ${loaderData?.columns.length})`,
                            flexShrink: 0
                        }}>{column.name}</Vertical>
                    })}
                </Horizontal>
            </Vertical>
            <Vertical h={'100%'} ref={containerRef}>
                {rows.map((row, index) => {
                    return <Vertical key={index}>
                        {row}
                    </Vertical>
                })}
            </Vertical>


            {/*{loaderData?.recordSet?.map((record,index) => {*/}
            {/*    return <tr key={index}>*/}
            {/*        {loaderData?.columns.map(col => {*/}
            {/*            return <td key={`${index}-${col.key}`}>*/}
            {/*                {record[col.key]}*/}
            {/*            </td>*/}
            {/*        })}*/}
            {/*    </tr>*/}
            {/*})}*/}

            <Vertical>
                THIS WILL BE THE FOOTER
            </Vertical>
        </Vertical>
    </PaperSheet>;
}


