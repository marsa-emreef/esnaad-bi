import {Horizontal, Vertical} from "react-hook-components";
import {HeaderPanel} from "~/components/HeaderPanel";
import type {ActionFunction, LoaderFunction} from "@remix-run/node";
import {json} from "@remix-run/node";
import {loadDb, persistDb} from "~/db/db.server";
import type {QueryModel, RendererModel} from "~/db/DbModel";
import {useLoaderData} from "@remix-run/react";
import {actionStateFunction, useRemixActionState, useRemixActionStateInForm} from "remix-hook-actionstate";
import {PlainWhitePanel} from "~/components/PlainWhitePanel";
import Label from "~/components/Label";
import {Button, Checkbox, Divider, Input, Select, Table, Tooltip} from "antd";
import {useEffect} from "react";
import TextArea from "antd/lib/input/TextArea";
import invariant from "tiny-invariant";

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
                      setState(oldVal => {
                          const newVal: QueryModel = JSON.parse(JSON.stringify(oldVal));
                          const column = newVal.columns.find(col => col.key === props.record.key);
                          invariant(column, 'Column is a must');
                          column.enabled = e.target.checked;
                          return newVal;
                      })
                  }}/>
    </Vertical>;
}

function NameColumnRenderer(props: { record: any, value: any }) {
    const [, setState, {useActionStateValue}] = useRemixActionStateInForm<QueryModel>();
    return <Vertical>
        <Input value={useActionStateValue(val => val?.columns.find(col => col.key === props.record.key)?.name)}
               onChange={(e) => {
                   setState(oldVal => {
                       const newVal: QueryModel = JSON.parse(JSON.stringify(oldVal));
                       const column = newVal.columns.find(col => col.key === props.record.key);
                       invariant(column, 'Column cannot be null');
                       column.name = e.target.value;
                       return newVal;
                   })
               }}
        />
    </Vertical>;
}

function RendererColumnRenderer(props: { record: any, value: any }) {
    const [state, setState, {useActionStateValue}] = useRemixActionStateInForm<QueryModel & { renderers: RendererModel[] }>();

    return <Vertical>
        <Select value={useActionStateValue(val => val?.columns.find(col => col.key === props.record.key)?.rendererId)}
                onSelect={(value: string) => {
                    setState((oldVal) => {
                        const newVal: QueryModel & { renderers: RendererModel[] } = JSON.parse(JSON.stringify(oldVal));
                        const column = newVal.columns.find(col => col.key === props.record.key);
                        invariant(column, 'Column is important');
                        column.rendererId = value;
                        return newVal;
                    })
                }}
        >
            {state.renderers.map(renderer => {
                return <Select.Option value={renderer.id} key={renderer.id}>{renderer.name}</Select.Option>
            })}
        </Select>
    </Vertical>;
}

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
        <HeaderPanel title={query.name}/>
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
                        <Tooltip title={errors?.description}>
                            <TextArea status={errors?.description ? 'error' : ''}
                                      value={useActionStateValue(state => state?.description)}
                                      onChange={(event) => {
                                          setState(oldVal => {
                                              return {...oldVal, description: event.target.value}
                                          });
                                      }}
                            />
                        </Tooltip>
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
    const intent = formData.get('intent');
    if (intent === 'save') {
        const db = await loadDb();
        const query = db.queries?.find(q => q.id === state?.id);
        invariant(query, 'Query object must not null');
        invariant(state?.name, 'Name is a must');
        query.name = state?.name;
        query.description = state?.description;
        query.sqlQuery = state?.sqlQuery;
        query.columns = state?.columns
        await persistDb();
        return json(state);
    }
    const errors = {};
    return json({...state, errors});
}