import {memo, useEffect} from "react";
import {Horizontal, Vertical} from "react-hook-components";
import {HeaderPanel} from "~/components/HeaderPanel";
import {PlainWhitePanel} from "~/components/PlainWhitePanel";
import {actionStateFunction, useRemixActionState} from "~/remix-hook-actionstate";
import Label from "~/components/Label";
import {Button, Divider, Input, Select, Table, Tooltip} from "antd";
import type {ColumnFilterModel, ColumnModel, QueryModel, RendererModel, ReportModel} from "~/db/model";
import type {ActionFunction, LoaderFunction} from "@remix-run/node";
import {json} from "@remix-run/node";
import {loadDb, persistDb} from "~/db/db.server";
import {ShouldReloadFunction, useLoaderData} from "@remix-run/react";
import {v4} from "uuid";
import invariant from "tiny-invariant";
import {query} from "~/db/esnaad.server";
import type {Dispatch, SetObserverAction} from "react-hook-useobserver";
import produce from "immer";
import {MdDelete} from "react-icons/md";
import {filterFunction} from "~/routes/reports/filterFunction";
import {ColumnsType} from "antd/lib/table";

export const loader: LoaderFunction = async ({params}) => {
    const id = params.id;

    const db = await loadDb();
    let data: ReportModel & { recordSet?: any[], originalRecordSet?: any[] } = {
        id: '',
        columnFilters: [],
        queryId: '',
        name: '',
        description: '',
        columns: [],
        securityCode: [],
        recordSet: [],
        originalRecordSet: []
    };
    if (id !== 'new') {
        const reportData: ((ReportModel & { recordSet?: any[], originalRecordSet?: any[] }) | undefined) = db.reports?.find(r => r.id === id);
        invariant(reportData, 'Report data cannot be empty');
        const qry = db.queries?.find(q => q.id === reportData.queryId);
        invariant(qry, 'Query data cannot be empty');
        const queryData = await query(qry.sqlQuery);
        reportData.recordSet = queryData.recordSet.filter(filterFunction(reportData.columnFilters));
        reportData.originalRecordSet = queryData.recordSet;
        data = reportData;
    }
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
    & { providers?: { queries?: QueryModel[], renderer?: RendererModel[] }, recordSet?: any[], originalRecordSet?: any[], errors?: ReportModel };

const FilterRowItemRenderer = memo(function FilterRowItemRenderer(props: { queries?: QueryModel[], queryId?: string, filter: ColumnFilterModel, setState: Dispatch<SetObserverAction<StateType>>, isEquals: boolean, isFreeText: boolean, originalRecordSet?: any[] }) {
    const {filter, setState, isFreeText, isEquals, queries, queryId,  originalRecordSet} = props;
    return <Horizontal key={filter.id} mB={10}>
        <Vertical w={100} style={{flexShrink: 0}}>
            <Select value={filter.joinType} onSelect={(value: 'and' | 'or') => {
                setState(produce(draft => {
                    const colIndex = draft.columnFilters.findIndex(f => f.id === filter.id);
                    draft.columnFilters[colIndex].joinType = value
                }));
            }}>
                <Select.Option value={'and'}>And</Select.Option>
                <Select.Option value={'or'}>Or</Select.Option>
            </Select>
        </Vertical>
        <Vertical mL={5} style={{width: 'calc((100% - 295px) / 2)', flexShrink: 0}}>
            <Select value={filter.columnKey} onSelect={(value: string) => {
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
            <Select value={filter.filterCondition} onSelect={(value: any) => {
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
        <Vertical mL={5} style={{width: 'calc((100% - 295px) / 2)', flexShrink: 0}}>
            {isEquals &&
                <Select value={filter.filterValue} disabled={!filter.columnKey} showSearch={true}
                        optionFilterProp="children"
                        filterOption={(input, option) => ((option!.children as unknown as string) || '').includes(input)}
                        onSelect={(value: string) => {
                            setState(produce(draft => {
                                const colIndex = draft.columnFilters.findIndex(f => f.id === filter.id);
                                draft.columnFilters[colIndex].filterValue = value;
                            }));
                        }}
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
                    {originalRecordSet?.reduce((set: Array<any>, data) => {
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
            {isFreeText && <Input value={filter.filterValue} disabled={!filter.columnKey} onChange={(val) => {
                setState(produce((draft) => {
                    const filterIndex = draft.columnFilters.findIndex(col => col.id === filter?.id);
                    draft.columnFilters[filterIndex].filterValue = val.target.value;
                }))
            }}/>}

        </Vertical>
        <Vertical w={35} mL={5}>
            <Button icon={<MdDelete/>} onClick={() => {
                setState(produce(draft => {
                    const indexId = draft.columnFilters.findIndex(cf => cf.id === filter.id);
                    draft.columnFilters.splice(indexId, 1);
                }));
            }}/>
        </Vertical>
    </Horizontal>;
});

export default function ReportRoute() {
    const loaderData = useLoaderData<ReportModel & { providers: { queries: QueryModel[], renderer: RendererModel[] } }>();
    const [$state, setState, {
        Form,
        ActionStateValue
    }] = useRemixActionState<StateType>(loaderData);
    const id = loaderData.id;
    useEffect(() => {
        setState(loaderData);
    }, [id]);
    const errors = $state.current?.errors;

    return <Vertical h={'100%'}>
        <ActionStateValue selector={state => $state?.current?.name || 'New Report'} render={(value) => {
            return <HeaderPanel title={value}/>
        }}/>

        <Vertical p={20} style={{flexGrow: 1}} overflow={'auto'}>
            <Form method={'post'}>
                <PlainWhitePanel>
                    <Label label={'Name'}>
                        <ActionStateValue selector={state => state?.name} render={(value) => {
                            return <Tooltip title={errors?.name}>
                                <Input status={errors?.name ? 'error' : ''} value={value}
                                       onChange={(event) => {
                                           setState(oldVal => {
                                               return {...oldVal, name: event.target.value}
                                           })
                                       }}/>
                            </Tooltip>
                        }}/>

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
                            const isNew = $state.current?.id === '';
                            return <Tooltip title={errors?.queryId}>
                                <Select disabled={!isNew} status={errors?.queryId ? 'error' : ''}
                                        value={value} onSelect={(value: string) => {
                                    setState(oldVal => {
                                        return {...oldVal, queryId: value}
                                    });
                                }}>
                                    {$state.current?.providers?.queries?.map(q => {
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
                    <ActionStateValue selector={state => state?.columnFilters} render={(columnFilters?: ColumnFilterModel[]) => {
                        return <>
                            {columnFilters?.map((filter: ColumnFilterModel) => {
                                const isEquals = filter.filterCondition === 'equals';
                                const isFreeText = !isEquals;
                                return <FilterRowItemRenderer queries={$state.current?.providers?.queries}
                                                              queryId={$state.current?.queryId}
                                                              originalRecordSet={$state.current?.originalRecordSet}
                                                              filter={filter} setState={setState} isEquals={isEquals}
                                                              isFreeText={isFreeText} key={filter.id}/>
                            })}
                        </>
                    }}/>
                    <Horizontal hAlign={'right'}>
                        <Button type={"dashed"} style={{marginRight: 5}} htmlType={'submit'} name={'intent'}
                                value={'applyFilter'}>Apply Filter Changes</Button>
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
                    <ActionStateValue selector={state => ({columns: state?.columns, recordSet: state?.recordSet})}
                                      render={({columns, recordSet}: { columns: ColumnModel[], recordSet: any[] }) => {
                                          const cols:ColumnsType<any> = columns?.map(col => {
                                              return {
                                                  title: col.name,
                                                  dataIndex: col.key,
                                                  key: col.key,
                                                  render : (value:any,record:any,index:number) => {
                                                      try{
                                                          const renderer = loaderData.providers.renderer.find(r => r.id === col.rendererId);
                                                          if(renderer === undefined){
                                                              return value;
                                                          }
                                                          invariant(renderer,'Renderer cannot be empty '+col.key+ ' '+col.rendererId);
                                                          const rendererFunction = renderer?.rendererFunction;
                                                          const F = new Function(`return (${rendererFunction})(...arguments)`);
                                                          //cellData,rowData,rowIndex,gridData,columnKey,columnName,context
                                                          const rowIndex = recordSet.indexOf(record);
                                                          return <Vertical>
                                                              {F.apply(null,[value,record,rowIndex,recordSet,col.key,col.name,{}])}
                                                          </Vertical>
                                                      }catch(err){
                                                          console.error(err);
                                                          return <Vertical>
                                                              Error
                                                          </Vertical>

                                                      }

                                                  }
                                              }
                                          });
                                          const rs = recordSet;
                                          return <Table scroll={{x: true, scrollToFirstRowOnChange: true}}
                                                        columns={cols} dataSource={rs}/>
                                      }}>

                    </ActionStateValue>
                    <Horizontal mT={10} hAlign={'right'}>
                        <Button htmlType={'submit'} type={"primary"} name={'intent'} value={'save'}>Save</Button>
                    </Horizontal>
                </PlainWhitePanel>
            </Form>
        </Vertical>
    </Vertical>
}

function validateErrors(state: ReportModel) {
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

    state.columnFilters.forEach(c => {
        const error: any & ColumnFilterModel = {};
        if (!c.filterCondition) {
            error.filterCondition = 'Filter condition required';
        }
        if (!c.filterValue) {
            error.filterValue = 'Filter value required';
        }
        if (!c.columnKey) {
            error.columnKey = 'Column key required';
        }
        if (!c.joinType) {
            error.joinType = 'Join type required';
        }
        const hasError = Object.values(error).some(err => err);
        if (hasError) {
            error.id = c.id;
            errors.columnFilters.push(error);
        }
    });

    const hasErrors = Object.values(errors).some(val => {
        if (Array.isArray(val)) {
            return val.length > 0;
        }
        return val;
    });
    return {errors, hasErrors};
}

export const action: ActionFunction = async ({request}) => {
    const formData = await request.formData();
    const state = await actionStateFunction<ReportModel & { recordSet: any[], originalRecordSet: any[] }>({formData});
    invariant(state, 'State cannot be empty');
    const intent = formData.get('intent');
    const {errors, hasErrors} = validateErrors(state);
    if (hasErrors) {
        return json({...state, errors});
    }
    if (intent === 'runQuery') {
        const db = await loadDb();
        const qry = db.queries?.find(q => q.id === state.queryId);
        invariant(qry, 'Query data must not null');
        const data = await query(qry.sqlQuery);
        return json({...state, errors, recordSet: data.recordSet.filter(filterFunction(state.columnFilters)),originalRecordSet:data.recordSet, columns: qry.columns.filter(c => c.enabled)});
    }
    if (intent === 'applyFilter') {
        const columnFilters = state.columnFilters;
        const recordSet = state.originalRecordSet.filter(filterFunction(columnFilters));
        return json({...state, recordSet});
    }
    if (intent === 'save') {
        const db = await loadDb();
        if (state.id) {
            const data = db.reports?.find(report => report.id === state.id);
            invariant(data, 'Report cannot be empty');
            data.name = state.name;
            data.description = state.description;
            data.queryId = state.queryId;
            data.columns = state.columns;
            data.columnFilters = state.columnFilters;
            data.securityCode = state.securityCode;
            await persistDb();
            return json({...state, ...data, errors})
        } else {
            const dataO: any = {};
            const data: ReportModel = dataO;
            data.name = state.name;
            data.description = state.description;
            data.queryId = state.queryId;
            data.columns = state.columns;
            data.columnFilters = state.columnFilters;
            data.securityCode = state.securityCode;
            data.id = v4()
            db.reports = db.reports || [];
            db.reports.push(data);
            await persistDb();
            return json({...state, ...data, errors})
        }
    }
    return json({...state});
}


export const unstable_shouldReload:ShouldReloadFunction = ({url,prevUrl,submission,params}) => {
    return false;
}