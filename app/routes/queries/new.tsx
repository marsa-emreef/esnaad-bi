import {Horizontal, Vertical} from "react-hook-components";
import {Button, Checkbox, Divider, Input, Select, Table} from "antd";
import TextArea from "antd/lib/input/TextArea";
import type {ActionFunction, LoaderFunction} from "@remix-run/node";
import {json, redirect} from "@remix-run/node";
import type {QueryResult} from "~/db/esnaad.server";
import {query} from "~/db/esnaad.server";
import type {ColumnsType} from "antd/lib/table";
import {actionStateFunction, useRemixActionState, useRemixActionStateInForm} from "remix-hook-actionstate";
import invariant from "tiny-invariant";
import {PanelHeader} from "~/components/PanelHeader";
import {PlainWhitePanel} from "~/components/PlainWhitePanel";
import Label from "~/components/Label";
import LabelWidth from "~/components/LabelWidth";
import type {ColumnModel, QueryModel, RendererModel} from "~/db/DbModel";
import {loadDb, persistDb} from "~/db/db.server";
import {useLoaderData} from "@remix-run/react";
import {v4} from "uuid";

export const action: ActionFunction = async ({request}) => {
    const formData = await request.formData();
    const actionState:QueryModel = await actionStateFunction<QueryModel>({formData}) || {columns: [],sqlQuery:'',id:'',name:'',description:''};

    const intent = formData.get('intent');
    if(intent === 'save'){
        const db = await loadDb();
        db.queries = db.queries || [];

        const data:QueryModel = {
            id : v4(),
            columns : actionState.columns,
            sqlQuery : actionState.sqlQuery,
            name : actionState.name,
            description : actionState.description
        }
        db.queries?.push(data);
        await persistDb();
        return redirect('/queries/'+data.id);
    }
    if (intent === 'runQuery') {
        const result: QueryResult = await query('select * from ADM_MST_AIR_BASES');
        actionState.columns = result.columns.map(col => {
            const existingItem = actionState?.columns?.find(map => map.key === col.key);
            if (existingItem) {
                return existingItem;
            }
            return {
                enabled: false,
                name: '',
                key: col.key,
                type: col.type,
                rendererId: ''
            }
        })
        return json(actionState)
    }
}

const LABEL_WIDTH = 130;


const columns: ColumnsType<ColumnModel> = [
    {
        title: 'Enable', dataIndex: 'enabled',
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

export const loader: LoaderFunction = async () => {
    const db = await loadDb();
    return json(db.renderer);
}
export default function NewRoute() {
    const renderers = useLoaderData<Array<RendererModel>>();

    const [state, setState, {Form}] = useRemixActionState<QueryModel & { renderers?: Array<RendererModel> }>({
        renderers,
        columns: [],
        id: '',
        sqlQuery: '',
        name: '',
        description: ''
    });

    const hasColumns = state?.columns;

    return <Vertical h={'100%'} overflow={'auto'}>
        <PanelHeader title={'New Query'}/>
        <Vertical p={20}>
            <Form method={'post'} style={{display: 'flex', flexDirection: 'column'}}>
                <PlainWhitePanel>
                    <LabelWidth width={LABEL_WIDTH}>
                        <Label label={'Name'}>
                            <Input style={{width: '100%'}} defaultValue={state?.name} onChange={(e) => {
                                setState((val: QueryModel) => {
                                    return {...val, name: e.target.value}
                                })
                            }}/>
                        </Label>
                        <Label label={'Description'} vAlign={'top'}>
                            <TextArea style={{width: '100%'}} onChange={(e) => {
                                setState((val: QueryModel) => {
                                    return {...val, description: e.target.value}
                                })
                            }} defaultValue={state?.description}/>
                        </Label>
                        <Label label={'SQL Query'} vAlign={'top'}>
                            <TextArea style={{width: '100%', height: 200}} onChange={(e) => {
                                setState((val: QueryModel) => {
                                    return {...val, sqlQuery: e.target.value}
                                })
                            }} defaultValue={state?.sqlQuery}/>
                        </Label>
                    </LabelWidth>
                    <Horizontal hAlign={'right'} mT={10}>
                        <Button type={"primary"} htmlType={"submit"} name={'intent'} value={'runQuery'}>Run
                            Query</Button>
                    </Horizontal>
                    {hasColumns &&
                        <Vertical>
                            <Horizontal vAlign={'center'}>
                                <Divider orientation={"left"}>Column Mapping</Divider>
                            </Horizontal>
                            <Table size={'small'} columns={columns} dataSource={state?.columns}/>
                            <Horizontal hAlign={'right'} mT={10}>
                                <Button type={"primary"} htmlType={"submit"} name={'intent'}
                                        value={'save'}>Save</Button>
                            </Horizontal>
                        </Vertical>
                    }
                </PlainWhitePanel>


            </Form>

        </Vertical>
    </Vertical>
}


function NameColumnRenderer(props: { value: any, record: ColumnModel }) {
    const [, setState,{useActionStateValue}] = useRemixActionStateInForm<QueryModel>();
    return <Vertical>
        <Input value={useActionStateValue(val => val?.columns.find(c => c.key === props.record.key)?.name)} onChange={(event) => {
            setState((val: QueryModel) => {
                const newVal: QueryModel = JSON.parse(JSON.stringify(val));
                const newRecord = newVal.columns.find(t => t.key === props.record.key);
                invariant(newRecord, 'record value is a must');
                newRecord.name = event.target.value;
                return newVal;
            });
        }}/>
    </Vertical>
}


function EnableColumnRenderer(props: { value: any, record: ColumnModel }) {
    const [, setState,{useActionStateValue}] = useRemixActionStateInForm<QueryModel>();
    return <Vertical>
        <Checkbox checked={useActionStateValue(val => val?.columns.find(c => c.key === props.record.key)?.enabled)} onChange={(event) => {
            setState((val: QueryModel) => {
                const newVal: QueryModel = JSON.parse(JSON.stringify(val));
                const newRecord = newVal.columns.find(t => t.key === props.record.key);
                invariant(newRecord, 'column value is a must');
                newRecord.enabled = event.target.checked;
                return newVal;
            });
        }}/>
    </Vertical>
}

function RendererColumnRenderer(props: { value: any, record: ColumnModel }) {
    const [state, setState,{useActionStateValue}] = useRemixActionStateInForm<QueryModel & { renderers: Array<RendererModel> }>();
    return <Vertical>
        <Select value={useActionStateValue(val => val?.columns.find(c => c.key === props.record.key)?.rendererId)} onSelect={(onSelectedValue: any) => {
            setState((value) => {
                const newVal: QueryModel & { renderers: RendererModel[] } = JSON.parse(JSON.stringify(value));
                const column = newVal.columns.find(col => col.key === props.record.key);
                invariant(column, 'Column object must not be undefined');
                column.rendererId = onSelectedValue;
                return {...newVal};
            });
        }}>
            {state.renderers.map(renderer => {
                return <Select.Option value={renderer.id} key={renderer.id}>{renderer.name}</Select.Option>
            })}
        </Select>
    </Vertical>
}
