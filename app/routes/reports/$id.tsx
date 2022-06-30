import {memo} from "react";
import {Horizontal, Vertical} from "react-hook-components";
import {HeaderPanel} from "~/components/HeaderPanel";
import {PlainWhitePanel} from "~/components/PlainWhitePanel";
import {actionStateFunction, useRemixActionState} from "~/remix-hook-actionstate";
import Label from "~/components/Label";
import {Button, Divider, Input, Select, Table, Tooltip} from "antd";
import type {ColumnFilterModel, QueryModel, RendererModel, ReportModel} from "~/db/DbModel";
import type {ActionFunction, LoaderFunction} from "@remix-run/node";
import {json} from "@remix-run/node";
import {loadDb} from "~/db/db.server";
import {useLoaderData} from "@remix-run/react";
import {v4} from "uuid";
import invariant from "tiny-invariant";
import {query} from "~/db/esnaad.server";
import type {Dispatch, SetObserverAction} from "react-hook-useobserver";
import produce, {original} from "immer";

export const loader: LoaderFunction = async () => {
    const db = await loadDb();
    const data: ReportModel = {
        id: '',
        columnFilters: [],
        queryId: '',
        name: '',
        description: '',
        columns: [],
        securityCode: []
    };
    return json({
        ...data,
        providers: {
            queries: db.queries,
            renderer: db.renderer
        }
    });
}


type StateType =
    ReportModel
    & { providers: { queries: QueryModel[], renderer: RendererModel[] }, recordSet?: any[], errors?: ReportModel };

const FilterRowItemRenderer =  memo(function FilterRowItemRenderer(props: { queries?: QueryModel[], queryId?: string, recordSet?: any[], filter: ColumnFilterModel, setState: Dispatch<SetObserverAction<StateType>>, isEquals: boolean, isFreeText: boolean }) {
    const {filter, setState, isFreeText, isEquals, queries, queryId, recordSet} = props;
    return <Horizontal key={filter.id} mB={10}>
        <Vertical w={100} style={{flexShrink: 0}}>
            <Select onSelect={(value: 'and' | 'or') => {
                setState(produce(draft => {
                    const colIndex = draft.columnFilters.findIndex(f => f.id === filter.id);
                    draft.columnFilters[colIndex].joinType = value
                }));
            }}>
                <Select.Option value={'and'}>And</Select.Option>
                <Select.Option value={'or'}>Or</Select.Option>
            </Select>
        </Vertical>
        <Vertical mL={5} style={{width: 'calc((100% - 255px) / 2)', flexShrink: 0}}>
            <Select onSelect={(value: string) => {
                setState(produce((draft) => {
                    const colIndex = draft.columnFilters.findIndex(f => f.id === filter.id);
                    draft.columnFilters[colIndex].columnKey = value;
                }));
            }}>
                {queries?.find(qry => qry.id === queryId)?.columns?.filter((col) => col.enabled)?.map(col => {
                    return <Select.Option value={col.key} key={col.key}>{col.name}</Select.Option>
                })}
            </Select>
        </Vertical>
        <Vertical w={140} mL={5} style={{flexShrink: 0}}>
            <Select onSelect={(value: any) => {
                setState(produce(draft => {
                    const colIndex = draft.columnFilters.findIndex(c => c.id === filter.id);
                    draft.columnFilters[colIndex].filterCondition = value;
                }))
            }}>
                <Select.Option value={'contains'}>Contains</Select.Option>
                <Select.Option value={'startsWith'}>Starts With</Select.Option>
                <Select.Option value={'endsWith'}>Ends With</Select.Option>
                <Select.Option value={'equals'}>Equals</Select.Option>
                <Select.Option value={'greaterThan'}>Greater Than</Select.Option>
                <Select.Option value={'lessThan'}>Less Than</Select.Option>
            </Select>
        </Vertical>
        <Vertical mL={5} style={{width: 'calc((100% - 255px) / 2)', flexShrink: 0}}>
            {isEquals &&
                <Select disabled={!filter.columnKey} showSearch={true} optionFilterProp="children"
                        filterOption={(input, option) => (option!.children as unknown as string).includes(input)}
                        filterSort={(optionA, optionB) => {
                            try {
                                return (optionA!.children as unknown as string)
                                    .toLowerCase()
                                    .localeCompare((optionB!.children as unknown as string).toLowerCase());
                            } catch (err) {
                                // we cant process this
                            }
                            return 0;
                        }}>
                    {recordSet?.reduce((set: Array<any>, data) => {
                        const key = filter.columnKey;
                        const val = data[key];
                        if (set.indexOf(val) < 0) {
                            set.push(val);
                        }
                        return set;
                    }, []).map(val => {
                        return <Select.Option key={val} value={val}>{val}</Select.Option>
                    })}
                </Select>
            }
            {isFreeText && <Input disabled={!filter.columnKey} onChange={(val) => {
                setState(produce((draft) => {

                    const filterIndex = original(draft)?.columnFilters.findIndex(col => col.id === filter?.id) || -1;
                    if (filterIndex != -1) {
                        draft.columnFilters[filterIndex].filterValue = val.target.value;
                    }
                }))
            }}/>}
        </Vertical>
    </Horizontal>;
});

export default function ReportRoute() {
    const loaderData = useLoaderData<ReportModel & { providers: { queries: QueryModel[], renderer: RendererModel[] } }>();
    const [state, setState, {
        Form,
        ActionStateValue
    }] = useRemixActionState<StateType>(loaderData);
    const errors = state?.errors;
    return <Vertical>
        <HeaderPanel title={'This is Report'}/>
        <Vertical p={20}>
            <Form method={'post'}>
                <PlainWhitePanel>
                    <Label label={'Name'}>
                        <Tooltip title={errors?.name}>
                            <Input status={errors?.name ? 'error' : ''} defaultValue={state?.name}
                                   onChange={(event) => {
                                       setState(oldVal => {
                                           return {...oldVal, name: event.target.value}
                                       })
                                   }}/>
                        </Tooltip>
                    </Label>
                    <Label label={'Description'}>
                        <ActionStateValue selector={val => val?.description} render={(value) => {
                            return <Input value={value} onChange={(event) => {
                                setState(oldVal => {
                                    return {...oldVal, description: event.target.value}
                                })
                            }}/>
                        }}/>
                    </Label>
                    <Label label={'Query'}>
                        <ActionStateValue selector={val => val?.queryId} render={(value) => {
                            return <Tooltip title={errors?.queryId}>
                                <Select status={errors?.queryId ? 'error' : ''}

                                        value={value} onSelect={(value: string) => {
                                    setState(oldVal => {
                                        return {...oldVal, queryId: value}
                                    });
                                }}>
                                    {state?.providers.queries.map(q => {
                                        return <Select.Option value={q.id} key={q.id}>{q.name}</Select.Option>
                                    })}
                                </Select>
                            </Tooltip>
                        }}/>
                    </Label>
                    <Horizontal hAlign={'right'}>
                        <Button htmlType={'submit'} name={'intent'} value={'runQuery'} type={'primary'}>Run
                            Query</Button>
                    </Horizontal>
                    <Divider orientation={"left"} style={{fontSize: '1rem'}}>Filters</Divider>
                    <ActionStateValue selector={state => state?.columnFilters} render={(columnFilter: any[]) => {
                        return <>
                            {columnFilter.map((filter: ColumnFilterModel) => {
                                const isEquals = filter.filterCondition === 'equals';
                                const isFreeText = !isEquals;
                                return <FilterRowItemRenderer queries={state?.providers.queries}
                                                              queryId={state?.queryId}
                                                              recordSet={state?.recordSet}
                                                              filter={filter} setState={setState} isEquals={isEquals}
                                                              isFreeText={isFreeText} key={filter.id}/>
                            })}
                        </>
                    }}/>
                    <Horizontal hAlign={'right'}>
                        <Button type={"primary"} onClick={() => {
                            setState(val => {
                                const columnFilters = [...val?.columnFilters];
                                const colFilter: ColumnFilterModel = {
                                    joinType: 'and',
                                    columnKey: '',
                                    filterCondition: 'equals',
                                    filterValue: '',
                                    children: [],
                                    id: v4()
                                }
                                columnFilters.push(colFilter);
                                return {...val, columnFilters}
                            })
                        }}>Add Filter</Button>
                    </Horizontal>
                    <Divider orientation={"left"}>Data</Divider>
                    <Table columns={state?.columns?.map(col => {
                        return {
                            title: col.name,
                            dataIndex: col.key,
                            key: col.key
                        }
                    })} dataSource={state?.recordSet}/>
                </PlainWhitePanel>
            </Form>
        </Vertical>
    </Vertical>
}

export const action: ActionFunction = async ({request}) => {
    const formData = await request.formData();
    const state = await actionStateFunction<ReportModel>({formData});
    invariant(state, 'State cannot be empty');
    const intent = formData.get('intent');
    if (intent === 'runQuery') {
        const errors: ReportModel = {
            id: '',
            name: '',
            queryId: '',
            columns: [],
            columnFilters: [],
            securityCode: [],
            description: ''
        };
        if (!state.name) {
            errors.name = 'Name must not null';
        }
        if (!state.queryId) {
            errors.queryId = 'Query Id must not null'
        }
        const hasErrors = Object.values(errors).some(val => {
            if (Array.isArray(val)) {
                return val.length > 0;
            }
            return val;
        });
        if (hasErrors) {
            return json({...state, errors});
        }
        const db = await loadDb();
        const qry = db.queries?.find(q => q.id === state.queryId);
        invariant(qry, 'Query data must not null');
        const data = await query(qry.sqlQuery);
        return json({...state, errors, recordSet: data.recordSet, columns: qry.columns.filter(c => c.enabled)});
    }
    return json({...state});
}
