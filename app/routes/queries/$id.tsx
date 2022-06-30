import {Horizontal, Vertical} from "react-hook-components";
import {HeaderPanel} from "~/components/HeaderPanel";
import type {ActionFunction, LoaderFunction} from "@remix-run/node";
import {json, redirect} from "@remix-run/node";
import {loadDb, persistDb} from "~/db/db.server";
import type {QueryModel, RendererModel} from "~/db/DbModel";
import {useLoaderData} from "@remix-run/react";
import {actionStateFunction, useRemixActionState, useRemixActionStateInForm} from "~/remix-hook-actionstate";
import {PlainWhitePanel} from "~/components/PlainWhitePanel";
import Label from "~/components/Label";
import {Button, Checkbox, Divider, Input, Select, Table, Tooltip} from "antd";
import {useEffect} from "react";
import TextArea from "antd/lib/input/TextArea";
import invariant from "tiny-invariant";
import type {QueryResult} from "~/db/esnaad.server";
import {query} from "~/db/esnaad.server";
import {validateErrors} from "~/routes/queries/validateErrors";
import produce from "immer";

export const loader: LoaderFunction = async ({params}) => {
    const id = params.id;
    const db = await loadDb();
    const query = db.queries?.find(q => q.id === id);

    // lets load loaders
    return json({...query, renderers: db.renderer});
}


function EnabledCellRenderer(props: { record: any, value: any }) {
    const [, setState, {useActionStateValue}] = useRemixActionStateInForm<QueryModel>();


    return <Vertical hAlign={'center'}>
        <Checkbox checked={useActionStateValue(val => val?.columns?.find(col => col.key === props.record.key)?.enabled)}
                  onChange={e => {
                      setState(produce(draft => {
                          const colIndex = draft.columns.findIndex(col => col.key === props.record.key);
                          draft.columns[colIndex].enabled = e.target.checked;
                      }))
                  }}/>
    </Vertical>;
}

function NameColumnRenderer(props: { record: any, value: any }) {
    const [, setState, {useActionStateValue}] = useRemixActionStateInForm<QueryModel & { errors?: QueryModel }>();
    const isEnabled = useActionStateValue(val => val?.columns.find(col => col.key === props.record.key)?.enabled);
    const error = useActionStateValue(val => val?.errors?.columns?.find(col => col.key === props.record.key)?.name);
    return <Vertical>
        <Tooltip title={error}>
            <Input status={error ? 'error' : ''} disabled={!isEnabled}
                   value={useActionStateValue(val => val?.columns.find(col => col.key === props.record.key)?.name)}
                   onChange={(e) => {
                       setState(produce(draft => {
                           const columnIndex = draft.columns.findIndex(col => col.key === props.record.key);
                           draft.columns[columnIndex].name = e.target.value;
                       }))
                   }}
            />
        </Tooltip>
    </Vertical>
}

function RendererColumnRenderer(props: { record: any, value: any }) {
    const [state, setState, {useActionStateValue}] = useRemixActionStateInForm<QueryModel & { renderers: RendererModel[], errors?: QueryModel }>();
    const isEnabled = useActionStateValue(val => val?.columns.find(col => col.key === props.record.key)?.enabled);
    const error = useActionStateValue(val => val?.errors?.columns?.find(col => col.key === props.record.key)?.rendererId);
    return <Vertical>
        <Tooltip title={error}>
            <Select status={error ? 'error' : ''} disabled={!isEnabled}
                    value={useActionStateValue(val => val?.columns.find(col => col.key === props.record.key)?.rendererId)}
                    onSelect={(value: string) => {
                        setState(produce((draft) => {
                            const columnIndex = draft.columns.findIndex(col => col.key === props.record.key);
                            draft.columns[columnIndex].rendererId = value;
                        }))
                    }}
            >
                {state.renderers.map(renderer => {
                    return <Select.Option value={renderer.id} key={renderer.id}>{renderer.name}</Select.Option>
                })}
            </Select>
        </Tooltip>
    </Vertical>
}

// eslint-disable-next-line
export default function QueriesRoute() {
    const query = useLoaderData<QueryModel>();
    const [state, setState, {
        Form,
        useActionStateValue
    }] = useRemixActionState<QueryModel & { errors?: QueryModel }>(query);
    const id = query.id;

    useEffect(() => {
        setState(query);
        // eslint-disable-next-line
    }, [id]);

    const errors = state?.errors;

    return <Vertical>
        <HeaderPanel title={state?.name || ''}/>
        <Form method={'post'}>
            <Vertical p={20}>
                <PlainWhitePanel>
                    <Label label={'Name'}>
                        <Tooltip title={errors?.name}>
                            <Input status={errors?.name ? 'error' : ''}
                                   value={useActionStateValue(state => state?.name)}
                                   onChange={(event) => {
                                       setState(oldVal => {
                                           return {...oldVal, name: event.target.value}
                                       })
                                   }}
                            />
                        </Tooltip>
                    </Label>
                    <Label label={'Description'} vAlign={'top'}>
                        <TextArea
                            value={useActionStateValue(state => state?.description)}
                            onChange={(event) => {
                                setState(oldVal => {
                                    return {...oldVal, description: event.target.value}
                                });
                            }}
                        />
                    </Label>
                    <Label label={'SQL Query'} vAlign={'top'}>
                        <Tooltip title={errors?.sqlQuery}>
                            <TextArea status={errors?.sqlQuery ? 'error' : ''}
                                      value={useActionStateValue(val => val?.sqlQuery)}
                                      style={{height: 200}}
                                      onChange={(event) => {
                                          setState(oldVal => {
                                              return {...oldVal, sqlQuery: event.target.value}
                                          })
                                      }}
                            />
                        </Tooltip>
                    </Label>
                    <Horizontal hAlign={'right'}>
                        <Button htmlType={'submit'} type={'primary'} name={'intent'} value={'runQuery'}>Run
                            Query</Button>
                    </Horizontal>
                    <Divider orientation={"left"}>Column Mapping</Divider>
                    <Table columns={[
                        {
                            title: 'Enabled',
                            dataIndex: 'enabled',
                            render: (value, record) => {
                                return <EnabledCellRenderer value={value} record={record}/>
                            }
                        },
                        {
                            title: 'Key',
                            dataIndex: 'key'
                        },
                        {
                            title: 'Type',
                            dataIndex: 'type'
                        },
                        {
                            title: 'Name',
                            dataIndex: 'name',
                            render: (value, record) => {
                                return <NameColumnRenderer value={value} record={record}/>
                            }

                        },
                        {
                            title: 'Renderer',
                            dataIndex: 'rendererId',
                            render: (value, record) => {
                                return <RendererColumnRenderer value={value} record={record}/>
                            }
                        }
                    ]} dataSource={state?.columns}/>
                    <Horizontal hAlign={'right'}>
                        <Button type={'link'} htmlType={'submit'} style={{marginRight: 5}} name={'intent'}
                                value={'delete'}>Delete</Button>
                        <Button type={'primary'} htmlType={'submit'} name={'intent'} value={'save'}>Save</Button>
                    </Horizontal>
                </PlainWhitePanel>
            </Vertical>
        </Form>
    </Vertical>
}

export const action: ActionFunction = async ({request}) => {
    const formData = await request.formData();
    const state = await actionStateFunction<QueryModel>({formData});
    invariant(state, 'State must have value');
    const intent = formData.get('intent');
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
    if (intent === 'save') {
        const {errors,hasErrors} = validateErrors(state);

        if (hasErrors) {
            return json({...state, errors});
        }
        const db = await loadDb();
        const query = db.queries?.find(q => q.id === state?.id);
        invariant(query, 'Query object must not null');
        invariant(state?.name, 'Name is a must');
        query.name = state?.name;
        query.description = state?.description;
        query.sqlQuery = state?.sqlQuery;
        query.columns = state?.columns
        await persistDb();
        return json({...state, errors: {}});
    }
    if (intent === 'delete') {
        const db = await loadDb();
        db.queries = db.queries?.filter(q => q.id !== state?.id);
        await persistDb();
        return redirect('/queries/new')
    }
    const errors = {};
    return json({...state, errors});
}