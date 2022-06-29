import {Horizontal, Vertical} from "react-hook-components";
import {createContext, useContext} from "react";
import {Button, Checkbox, Input, Select, Table} from "antd";
import TextArea from "antd/lib/input/TextArea";
import type {ActionFunction, LoaderFunction} from "@remix-run/node";
import { json} from "@remix-run/node";
import type { QueryResult} from "~/db/esnaad.server";
import {query} from "~/db/esnaad.server";
import type {ColumnsType} from "antd/lib/table";
import {actionStateFunction, useRemixActionState} from "remix-hook-actionstate";
import type {Dispatch, SetObserverAction} from "react-hook-useobserver";
import { emptySetObserver} from "react-hook-useobserver";
import invariant from "tiny-invariant";
import {PanelHeader} from "~/components/PanelHeader";
import {PlainWhitePanel} from "~/components/PlainWhitePanel";
import Label from "~/components/Label";
import LabelWidth from "~/components/LabelWidth";

export const loader: LoaderFunction = async () => {
    return json({name: 'arif', description: 'this is my description'});
}

export const action: ActionFunction = async ({request}) => {
    const formData = await request.formData();
    const actionState = await actionStateFunction<FormModel>({formData}) || {queryResultMap:undefined};
    const intent = formData.get('intent');
    if (intent === 'runQuery') {
        const result: QueryResult = await query('select * from ADM_MST_AIR_BASES');
        actionState.queryResultMap = result.columns.map(col => {
            const existingItem = actionState?.queryResultMap?.find(map => map.key === col.key);
            if (existingItem) {
                return existingItem;
            }
            return {
                enabled: false,
                id: '',
                name: '',
                key: col.key,
                type: col.type,
                renderer: ''
            }
        })
        return json(actionState)
    }
}

const LABEL_WIDTH = 130;


const columns: ColumnsType<QueryResultMapType> = [
    {
        title: 'Enable', dataIndex: 'enabled', key: 'enabled',
        render: (value, record) => {
            return <EnableColumnRenderer value={value} record={record}/>
        }
    },
    {
        title: "Key",
        dataIndex: "key",
    },
    {
        title: "Type",
        dataIndex: "type",
    },
    {
        title: "Name",
        dataIndex: "name",
        render: (value, record) => {
            return <NameColumnRenderer value={value} record={record}/>
        }
    },
    {
        title: 'Renderer',
        dataIndex: 'renderer',
        render: (value, record) => {
            return <RendererColumnRenderer value={value} record={record}/>
        }
    }
]

interface FormModel {
    name: string,
    description: string,
    sqlQuery: string,
    queryResultMap: Array<QueryResultMapType>
}

interface QueryResultMapType {
    key: string,
    type: string,
    name: string,
    renderer: string,
    id: string,
    enabled: boolean
}


export default function NewRoute() {
    const [state, setState, {Form}] = useRemixActionState<FormModel>();
    const hasColumns = state?.queryResultMap;

    return <Vertical h={'100%'} overflow={'auto'}>
        <PanelHeader title={'New Query'}/>
        <Vertical p={20}>
            <Form method={'post'} style={{display: 'flex', flexDirection: 'column'}}>
                <PlainWhitePanel>
                    <LabelWidth width={LABEL_WIDTH}>
                        <Label label={'Name'}>
                            <Input style={{width: '100%'}} defaultValue={state?.name} onChange={(e) => {
                                setState((val: FormModel) => {
                                    return {...val, name: e.target.value}
                                })
                            }}/>
                        </Label>
                        <Label label={'Description'} vAlign={'top'}>
                            <TextArea style={{width: '100%'}} onChange={(e) => {
                                setState((val: FormModel) => {
                                    return {...val, description: e.target.value}
                                })
                            }} defaultValue={state?.description}/>
                        </Label>
                        <Label label={'SQL Query'} vAlign={'top'}>
                            <TextArea style={{width: '100%', height: 200}} onChange={(e) => {
                                setState((val: FormModel) => {
                                    return {...val, sqlQuery: e.target.value}
                                })
                            }} defaultValue={state?.sqlQuery}/>
                        </Label>
                    </LabelWidth>
                    <Horizontal hAlign={'right'} mT={10}>
                        <Button type={"primary"} htmlType={"submit"} name={'intent'} value={'runQuery'}>Run
                            Query</Button>
                    </Horizontal>
                </PlainWhitePanel>


                {hasColumns &&
                    <PlainWhitePanel>
                        <TableContext.Provider value={{setState, state}}>
                            <Table size={'small'} columns={columns} dataSource={state?.queryResultMap}/>
                        </TableContext.Provider>
                    </PlainWhitePanel>
                }

            </Form>

        </Vertical>
    </Vertical>
}
const TableContext = createContext<{ state: any, setState: Dispatch<SetObserverAction<any>> }>({
    state: {},
    setState: emptySetObserver
});

function NameColumnRenderer(props: { value: any, record: any }) {
    const context = useContext(TableContext);
    return <Vertical>
        <Input defaultValue={props.value} onChange={(event) => {
            context.setState((val: FormModel) => {
                const newVal: FormModel = JSON.parse(JSON.stringify(val));
                const newRecord = newVal.queryResultMap.find(t => t.key === props.record.key);
                invariant(newRecord, 'record value is a must');
                newRecord.name = event.target.value;
                return newVal;
            });
        }}/>
    </Vertical>
}


function EnableColumnRenderer(props: { value: any, record: any }) {
    const context = useContext(TableContext);
    return <Vertical>
        <Checkbox defaultChecked={props.value} onChange={(event) => {
            context.setState((val: FormModel) => {
                const newVal: FormModel = JSON.parse(JSON.stringify(val));
                const newRecord = newVal.queryResultMap.find(t => t.key === props.record.key);
                invariant(newRecord, 'column value is a must');
                newRecord.enabled = event.target.checked;
                return newVal;
            });
        }}/>
    </Vertical>
}

function RendererColumnRenderer(props: { value: any, record: any }) {
    const context = useContext(TableContext);
    return <Vertical>
        <Select>
            <Select.Option value={'One'}>One</Select.Option>
        </Select>
    </Vertical>
}

const RendererOption = [
    {
        rendererName: 'Numeric',
        parameters: [
            {
                name: 'decimalValue',
                type: 'number'
            }
        ]
    }
];