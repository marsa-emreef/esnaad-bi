import {Horizontal, Vertical} from "react-hook-components";
import {Button, Checkbox, Divider, Input, Select, Table, Tooltip} from "antd";
import TextArea from "antd/lib/input/TextArea";
import type {ActionFunction, LoaderFunction} from "@remix-run/node";
import {json, redirect} from "@remix-run/node";
import type {QueryResult} from "~/db/esnaad.server";
import {query} from "~/db/esnaad.server";
import type {ColumnsType} from "antd/lib/table";
import {actionStateFunction, useRemixActionState, useRemixActionStateInForm} from "~/remix-hook-actionstate";
import {HeaderPanel} from "~/components/HeaderPanel";
import {PlainWhitePanel} from "~/components/PlainWhitePanel";
import Label from "~/components/Label";
import LabelWidth from "~/components/LabelWidth";
import type {ColumnModel, QueryModel, RendererModel} from "~/db/DbModel";
import {loadDb, persistDb} from "~/db/db.server";
import {useLoaderData} from "@remix-run/react";
import {v4} from "uuid";
import {validateErrors} from "~/routes/queries/validateErrors";
import produce from "immer";

export const action: ActionFunction = async ({request}) => {
    const formData = await request.formData();
    const state: QueryModel = await actionStateFunction<QueryModel>({formData}) || {
        columns: [],
        sqlQuery: '',
        id: '',
        name: '',
        description: ''
    };

    const intent = formData.get('intent');
    if (intent === 'save') {
        const {errors,hasErrors} = validateErrors(state);

        if (hasErrors) {
            return json({...state, errors});
        }
        const db = await loadDb();
        db.queries = db.queries || [];

        const data: QueryModel = {
            id: v4(),
            columns: state.columns,
            sqlQuery: state.sqlQuery,
            name: state.name,
            description: state.description
        }
        db.queries?.push(data);
        await persistDb();
        return redirect('/queries/' + data.id);
    }
    if (intent === 'runQuery') {
        const {errors,hasErrors} = validateErrors(state);

        if (hasErrors) {
            return json({...state, errors});
        }
        try {
            const result: QueryResult = await query(state?.sqlQuery);
            state.columns = result.columns.map(col => {
                const existingItem = state?.columns?.find(map => map.key === col.key);
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
            return json({...state, errors: {}});
        } catch (err: any) {
            errors.sqlQuery = err.message;
            return json({...state, errors});
        }


    }
}

const LABEL_WIDTH = 130;


export const columns: ColumnsType<ColumnModel> = [
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

    const [state, setState, {Form}] = useRemixActionState<QueryModel & { renderers?: RendererModel[], errors?: QueryModel }>({
        errors: undefined,
        renderers,
        columns: [],
        id: '',
        sqlQuery: '',
        name: '',
        description: ''
    });
    const errors = state?.errors;
    return <Vertical h={'100%'} overflow={'auto'}>
        <HeaderPanel title={'New Query'}/>
        <Vertical p={20}>
            <Form method={'post'} style={{display: 'flex', flexDirection: 'column'}}>
                <PlainWhitePanel>
                    <LabelWidth width={LABEL_WIDTH}>
                        <Label label={'Name'}>
                            <Tooltip title={errors?.name}>
                                <Input style={{width: '100%'}} defaultValue={state?.name} onChange={(e) => {
                                    setState((val: QueryModel) => {
                                        return {...val, name: e.target.value}
                                    })
                                }} status={errors?.name ? 'error' : ''}/>
                            </Tooltip>
                        </Label>
                        <Label label={'Description'} vAlign={'top'}>
                            <TextArea style={{width: '100%'}} onChange={(e) => {
                                setState((val: QueryModel) => {
                                    return {...val, description: e.target.value}
                                })
                            }} defaultValue={state?.description}/>
                        </Label>
                        <Label label={'SQL Query'} vAlign={'top'}>
                            <Tooltip title={errors?.sqlQuery}>
                                <TextArea style={{width: '100%', height: 200}} onChange={(e) => {
                                    setState((val: QueryModel) => {
                                        return {...val, sqlQuery: e.target.value}
                                    })
                                }} defaultValue={state?.sqlQuery} status={errors?.sqlQuery ? 'error' : ''}/>
                            </Tooltip>
                        </Label>
                    </LabelWidth>
                    <Horizontal hAlign={'right'}>
                        <Button type={"primary"} htmlType={"submit"} name={'intent'} value={'runQuery'}>Run
                            Query</Button>
                    </Horizontal>


                    <Horizontal vAlign={'center'}>
                        <Divider orientation={"left"}>Column Mapping</Divider>
                    </Horizontal>

                    <Table size={'small'} columns={columns} dataSource={state?.columns}/>

                    <Horizontal hAlign={'right'} mT={10}>
                        <Button type={"primary"} htmlType={"submit"} name={'intent'}
                                value={'save'}>Save</Button>
                    </Horizontal>
                </PlainWhitePanel>


            </Form>

        </Vertical>
    </Vertical>
}


function NameColumnRenderer(props: { value: any, record: ColumnModel }) {
    const [, setState, {useActionStateValue}] = useRemixActionStateInForm<QueryModel & {errors?:QueryModel}>();
    const isEnabled = useActionStateValue(val => val?.columns.find(c => c.key === props.record.key)?.enabled);
    const error = useActionStateValue(val => val?.errors?.columns?.find(c => c.key === props.record.key)?.name);
    return <Vertical>
        <Tooltip title={error}>
        <Input status={error ? 'error' : ''} value={useActionStateValue(val => val?.columns.find(c => c.key === props.record.key)?.name)}
               onChange={(event) => {
                   setState(produce((draft) => {
                       const colIndex = draft.columns.findIndex(t => t.key === props.record.key);
                       draft.columns[colIndex].name = event.target.value;
                   }));
               }} disabled={!isEnabled}/>
        </Tooltip>
    </Vertical>
}


function EnableColumnRenderer(props: { value: any, record: ColumnModel }) {
    const [, setState, {useActionStateValue}] = useRemixActionStateInForm<QueryModel>();
    return <Vertical>
        <Checkbox checked={useActionStateValue(val => val?.columns.find(c => c.key === props.record.key)?.enabled)}
                  onChange={(event) => {
                      setState(produce((draft) => {
                          const colIndex = draft.columns.findIndex(t => t.key === props.record.key);
                          draft.columns[colIndex].enabled = event.target.checked;
                      }));
                  }}/>
    </Vertical>
}

function RendererColumnRenderer(props: { value: any, record: ColumnModel }) {
    const [state, setState, {useActionStateValue}] = useRemixActionStateInForm<QueryModel & { renderers: Array<RendererModel>, errors?: QueryModel }>();
    const isEnabled = useActionStateValue(val => val?.columns.find(c => c.key === props.record.key)?.enabled);
    const error = useActionStateValue(val => val?.errors?.columns?.find(c => c.key === props.record.key)?.rendererId);
    return <Vertical>
        <Tooltip title={error}>
            <Select status={error ? 'error' : ''} disabled={!isEnabled}
                    value={useActionStateValue(val => val?.columns.find(c => c.key === props.record.key)?.rendererId)}
                    onSelect={(value: any) => {
                        setState(produce((draft) => {
                            const colIndex = draft.columns.findIndex(col => col.key === props.record.key);
                            draft.columns[colIndex].rendererId = value;
                        }));
                    }}>
                {state.renderers.map(renderer => {
                    return <Select.Option value={renderer.id} key={renderer.id}>{renderer.name}</Select.Option>
                })}
            </Select>
        </Tooltip>
    </Vertical>
}
