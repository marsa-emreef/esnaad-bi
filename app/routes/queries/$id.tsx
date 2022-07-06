import {Horizontal, Vertical} from "react-hook-components";
import {HeaderPanel} from "~/components/HeaderPanel";
import type {ActionFunction, LoaderFunction} from "@remix-run/node";
import {json, redirect} from "@remix-run/node";
import {loadDb, persistDb} from "~/db/db.server";
import type {ColumnModel, QueryModel, RendererModel} from "~/db/model";
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
import produce from "immer";
import {v4} from "uuid";
import {dbTypeToJsType} from "~/db/dbTypeToJsType";
import {MdDeleteOutline, MdOutlineSave, MdPlayArrow} from "react-icons/md";
import PopConfirmSubmit from "~/components/PopConfirmSubmit";

export const loader: LoaderFunction = async ({params}) => {
    const id = params.id;
    const isNew = id === 'new';
    let query: QueryModel | undefined = {
        id: '',
        name: '',
        sqlQuery: '',
        description: '',
        columns: []
    }
    const db = await loadDb();
    if (!isNew) {
        query = db.queries?.find(q => q.id === id);
    }
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
    const [$state, setState, {useActionStateValue}] = useRemixActionStateInForm<QueryModel & { renderers: RendererModel[], errors?: QueryModel }>();
    const state = $state.current;
    const isEnabled = useActionStateValue(val => val?.columns.find(col => col.key === props.record.key)?.enabled);
    const error = useActionStateValue(val => val?.errors?.columns?.find(col => col.key === props.record.key)?.rendererId);
    const value = useActionStateValue(val => val?.columns.find(col => col.key === props.record.key)?.rendererId);
    const type = useActionStateValue(val => val?.columns.find(col => col.key === props.record.key)?.type);
    const mapType = dbTypeToJsType(type);
    return <Vertical>
        <Tooltip title={error}>
            <Select status={error ? 'error' : ''} disabled={!isEnabled}
                    value={value}
                    onSelect={(value: string) => {
                        setState(produce((draft) => {
                            const columnIndex = draft.columns.findIndex(col => col.key === props.record.key);
                            draft.columns[columnIndex].rendererId = value;
                        }))
                    }}
            >
                {state?.renderers.filter(r => r.typeOf === mapType).map(renderer => {
                    return <Select.Option value={renderer.id} key={renderer.id}>{renderer.name}</Select.Option>
                })}
            </Select>
        </Tooltip>
    </Vertical>
}

export default function QueriesRoute() {
    const query = useLoaderData<QueryModel>();
    const [$state, setState, {
        Form,
        ActionStateValue
    }] = useRemixActionState<QueryModel & { errors?: QueryModel }>(query);

    const id = query.id;

    useEffect(() => {
        setState(query);
        // eslint-disable-next-line
    }, [id]);

    const errors = $state.current?.errors;

    return <Vertical h={'100%'}>
        <ActionStateValue selector={state => state?.name} render={(value) => {
            return <HeaderPanel title={value}/>
        }}/>

        <Vertical p={20} style={{flexGrow: 1}} overflow={'auto'}>
            <Form method={'post'}>
                <PlainWhitePanel>
                    <p style={{backgroundColor:'rgba(0,0,0,0.05)',borderLeft:'5px solid #BBB',padding:10,fontStyle:'italic'}}>The Query data comprises information about the SQL query that will be executed against the database. In addition to being able to describe a SQL query in the query object, we can also define the columns we wish to enable, as well as the column's name and the renderer used to render the column.</p>
                    <Label label={'Name'}>
                        <ActionStateValue selector={state => state?.name} render={(value) => {
                            return <Tooltip title={errors?.name}>
                                <Input status={errors?.name ? 'error' : ''}
                                       value={value}
                                       onChange={(event) => {
                                           setState(oldVal => {
                                               return {...oldVal, name: event.target.value}
                                           })
                                       }}
                                />
                            </Tooltip>
                        }}/>

                    </Label>
                    <Label label={'Description'} vAlign={'top'}>
                        <ActionStateValue selector={state => state?.description} render={(value) => {
                            return <Input
                                value={value}
                                onChange={(event) => {
                                    setState(oldVal => {
                                        return {...oldVal, description: event.target.value}
                                    });
                                }}
                            />
                        }}/>

                    </Label>
                    <Label label={'SQL Query'} vAlign={'top'}>
                        <ActionStateValue selector={state => state?.sqlQuery} render={(value) => {
                            return <Tooltip title={errors?.sqlQuery}>
                                <TextArea status={errors?.sqlQuery ? 'error' : ''}
                                          value={value}
                                          style={{height: 200}}
                                          onChange={(event) => {
                                              setState(oldVal => {
                                                  return {...oldVal, sqlQuery: event.target.value}
                                              })
                                          }}
                                />
                            </Tooltip>
                        }}/>

                    </Label>
                    <Horizontal hAlign={'right'}>
                        <Button htmlType={'submit'} type={'primary'} name={'intent'} value={'runQuery'} icon={<MdPlayArrow style={{marginRight:5,marginBottom:-5,fontSize:'1.2rem'}}/>}>Run
                            Query</Button>
                    </Horizontal>
                    <Divider orientation={"left"}>Column Mapping</Divider>
                    <ActionStateValue selector={state => state?.columns} render={(value) => {
                        return <Table size={"small"} scroll={{x: true}} columns={[
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
                        ]} dataSource={value}/>
                    }}/>
                    <ActionStateValue selector={state => state?.id} render={value => {
                        const isNew = value === '';
                        return <Horizontal hAlign={'right'}>
                            {!isNew &&
                                <PopConfirmSubmit title={`Are you sure you want to delete this query?`} okText={'Yes'} cancelText={'No'} placement={"topRight"} >
                                <Button type={'link'} htmlType={'submit'} style={{marginRight: 5}} name={'intent'}
                                        value={'delete'} icon={<MdDeleteOutline style={{fontSize:'1.2rem',marginRight:5,marginBottom:-5}}/>}>Delete</Button>
                                </PopConfirmSubmit>
                            }
                            <PopConfirmSubmit title={`Are you sure you want to ${isNew?'create new':'update the'} query?`} okText={'Yes'} cancelText={'No'} placement={"topRight"} >
                            <Button type={'primary'} htmlType={'submit'} name={'intent'} value={'save'} icon={<MdOutlineSave style={{fontSize:'1.2rem',marginRight:5,marginBottom:-5}}/>}>{isNew?'Save':'Update'}</Button>
                            </PopConfirmSubmit>
                        </Horizontal>
                    }}/>
                </PlainWhitePanel>
            </Form>
        </Vertical>
    </Vertical>
}

export const action: ActionFunction = async ({request}) => {
    const formData = await request.formData();
    const state = await actionStateFunction<QueryModel>({formData});
    invariant(state, 'State must have value');
    const intent = formData.get('intent');
    if (intent === 'runQuery') {
        const {errors, hasErrors} = validateErrors(state);
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
                    active: false,
                    width: 0,
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
        const {errors, hasErrors} = validateErrors(state);
        if (hasErrors) {
            return json({...state, errors});
        }
        const isNew = state.id === '';
        const db = await loadDb();
        if (isNew) {
            const data: QueryModel = {
                id: v4(),
                columns: state.columns,
                sqlQuery: state.sqlQuery,
                name: state.name,
                description: state.description
            }
            db.queries = db.queries || [];
            db.queries.push(data);
            await persistDb();
            return redirect('/queries/' + data.id);
        } else {
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


function validateErrors(state: QueryModel) {
    const errors: QueryModel = {id: '', sqlQuery: '', name: '', description: '', columns: []};
    if (!state.name) {
        errors.name = 'Name is Required';
    }
    if (!state.sqlQuery) {
        errors.sqlQuery = 'SQL Query is required';
    }
    state.columns.forEach(col => {
        const colError: ColumnModel = {
            name: '',
            enabled: false,
            rendererId: '',
            key: '',
            type: '',
            active: false,
            width: 0
        };
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
    return {errors, hasErrors};
}