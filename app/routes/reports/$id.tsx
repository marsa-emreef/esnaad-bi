import type { SetStateAction} from "react";
import {memo, useEffect, useMemo, useState} from "react";
import {Horizontal, Vertical} from "react-hook-components";
import {HeaderPanel} from "~/components/HeaderPanel";
import {PlainWhitePanel} from "~/components/PlainWhitePanel";
import {actionStateFunction, useRemixActionState} from "~/remix-hook-actionstate";
import Label from "~/components/Label";
import {Button, Checkbox, Collapse, Input, Select, Table, Tooltip} from "antd";
import type {ColumnFilterModel, ColumnModel, QueryModel, RendererModel, ReportModel} from "~/db/model";
import type {ActionFunction, LoaderFunction} from "@remix-run/node";
import {json, redirect} from "@remix-run/node";
import {loadDb, persistDb} from "~/db/db.server";
import type {ShouldReloadFunction} from "@remix-run/react";
import {useLoaderData} from "@remix-run/react";
import {v4} from "uuid";
import invariant from "tiny-invariant";
import {query} from "~/db/esnaad.server";
import type {Dispatch, SetObserverAction} from "react-hook-useobserver";
import produce from "immer";
import {IoMdAddCircleOutline} from "react-icons/io";
import {MdOutlineUpdate} from "react-icons/md";
import {
    MdDelete,
    MdKeyboardArrowDown,
    MdKeyboardArrowLeft,
    MdKeyboardArrowRight,
    MdKeyboardArrowUp,
    MdPlayArrow,
    MdDeleteOutline,
    MdOutlineSave
} from "react-icons/md";
import {filterFunction} from "~/routes/reports/filterFunction";
import type {ColumnsType} from "antd/lib/table";
import mapFunction from "~/routes/reports/mapFunction";


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

        reportData.recordSet = queryData.recordSet.map(mapFunction(qry.columns, db.renderer || [])).filter(filterFunction(reportData.columnFilters));
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

const emptyArray: any = [];

const FilterRowItemRenderer = memo(function FilterRowItemRenderer(props: { queries?: QueryModel[], queryId?: string, filter: ColumnFilterModel, setState: Dispatch<SetObserverAction<StateType>>, isEquals: boolean, isFreeText: boolean, originalRecordSet?: any[], renderers: RendererModel[], rowIndex: number }) {
    const {filter, setState, isFreeText, isEquals, queries, queryId, originalRecordSet, renderers, rowIndex} = props;
    const query = queries?.find(qry => qry.id === queryId);
    const columns = query?.columns || emptyArray;
    const isFirstIndex = rowIndex === 0;
    return <Horizontal key={filter.id} mB={10}>
        <Vertical w={100} style={{flexShrink: 0, backgroundColor: isFirstIndex ? 'rgba(0,0,0,0.05)' : 'none'}}>
            {!isFirstIndex &&
                <Select value={filter.joinType} onSelect={(value: 'and' | 'or') => {
                    setState(produce(draft => {
                        const colIndex = draft.columnFilters.findIndex(f => f.id === filter.id);
                        draft.columnFilters[colIndex].joinType = value
                    }));
                }}>
                    <Select.Option value={'and'}>And</Select.Option>
                    <Select.Option value={'or'}>Or</Select.Option>
                </Select>
            }
        </Vertical>
        <Vertical mL={5} style={{width: 'calc((100% - 295px) / 2)', flexShrink: 0}}>
            <Select value={filter.columnKey} onSelect={(value: string) => {
                setState(produce((draft) => {
                    const colIndex = draft.columnFilters.findIndex(f => f.id === filter.id);
                    draft.columnFilters[colIndex].columnKey = value;
                }));
            }}>
                {useMemo(() => {
                    return columns.filter((col: ColumnModel) => col.enabled)?.map((col: ColumnModel) => {
                        return <Select.Option value={col.key} key={col.key}>{col.name}</Select.Option>
                    })
                }, [columns])}
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
            <Vertical style={{display: isEquals ? 'flex' : 'none'}}>
                <Select value={filter.filterValue} disabled={!filter.columnKey} showSearch={true}
                        optionFilterProp="children"
                        filterOption={(input, option) => ((option!.children as unknown as string) || '').toString().includes(input)}
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
                                // we can not process this
                            }
                            return 0;
                        }}>
                    {useMemo(() => {
                        return originalRecordSet?.map(mapFunction(columns, renderers)).reduce((set: Array<any>, data) => {
                            const key = filter.columnKey;
                            const val = data[key];
                            if (set.indexOf(val) < 0) {
                                set.push(val);
                            }
                            return set;
                        }, []).map(val => {
                            return <Select.Option key={val} value={val}>
                                <div dangerouslySetInnerHTML={{__html: val}}/>
                            </Select.Option>
                        })
                    }, [columns, filter.columnKey, originalRecordSet, renderers])}
                </Select>
            </Vertical>
            <Vertical style={{display: isFreeText ? 'flex' : 'none'}}>
                <Input value={filter.filterValue} disabled={!filter.columnKey} onChange={(val) => {
                    setState(produce((draft) => {
                        const filterIndex = draft.columnFilters.findIndex(col => col.id === filter?.id);
                        draft.columnFilters[filterIndex].filterValue = val.target.value;
                    }))
                }}/>
            </Vertical>
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

function ColumnsOrderAndSort(props: { columns: ColumnModel[], setState: Dispatch<SetStateAction<StateType>> }) {

    const {columns, setState} = props;
    const [selectedRightColumns, setSelectedRightColumns] = useState<string[]>([]);
    const [selectedLeftColumns, setSelectedLeftColumns] = useState<string[]>([]);

    return <Horizontal>
        <Vertical style={{border: '1px solid lightgrey', padding: '5px', paddingTop: '15px', flexGrow: 1}} m={5}
                  r={2}
                  position={'relative'}>
            <Vertical top={-18} left={10} p={5} position={'absolute'} backgroundColor={'#fff'} style={{zIndex: 1}}>Active
                Columns</Vertical>
            <Vertical>
                {columns.filter(c => c.active).map((col, index, source) => {
                    const isFirstIndex = index === 0;
                    const isLastIndex = index === source.length - 1;
                    return <Horizontal key={col.key} mB={5}>
                        <Vertical style={{border: '1px solid lightgrey', padding: '3px 5px', flexGrow: 1}} mR={5}
                                  r={2}>
                            <Checkbox checked={selectedLeftColumns.includes(col.key)}
                                      onChange={(e) => {
                                          setSelectedLeftColumns(old => {
                                              if (e.target.checked && !old.includes(col.key)) {
                                                  return [...old, col.key];
                                              }
                                              if (!e.target.checked && old.includes(col.key)) {
                                                  return old.filter(c => c !== col.key);
                                              }
                                              return old;
                                          });
                                      }}
                            >{col.name}</Checkbox>
                        </Vertical>
                        <Vertical style={{opacity: isLastIndex ? 0 : 1}} mR={5}>
                            <Button onClick={() => {
                                setState(produce(old => {
                                    const colIndex = old.columns.findIndex(c => c.key === col.key);
                                    const {nextActiveIndex} = old.columns.reduce((res, col, index) => {
                                        if (col.active && index < res.currentIndex) {
                                            res.prevActiveIndex = index;
                                        }
                                        if (col.active && index > res.currentIndex && res.nextActiveIndex === 0) {
                                            res.nextActiveIndex = index;
                                        }
                                        return res;
                                    }, {
                                        currentIndex: colIndex,
                                        prevActiveIndex: 0,
                                        nextActiveIndex: 0
                                    });
                                    old.columns.splice(colIndex, 1);
                                    old.columns.splice(nextActiveIndex, 0, col);
                                }));
                            }} icon={<MdKeyboardArrowDown style={{fontSize: '1.5rem'}}/>}/>
                        </Vertical>
                        <Vertical style={{opacity: isFirstIndex ? 0 : 1}}>
                            <Button icon={<MdKeyboardArrowUp style={{fontSize: '1.5rem'}}/>} onClick={() => {

                                setState(produce(old => {
                                    const colIndex = old.columns.findIndex(c => c.key === col.key);
                                    const {prevActiveIndex} = old.columns.reduce((res, col, index) => {
                                        if (col.active && index < res.currentIndex) {
                                            res.prevActiveIndex = index;
                                        }
                                        if (col.active && index > res.currentIndex && res.nextActiveIndex === 0) {
                                            res.nextActiveIndex = index;
                                        }
                                        return res;
                                    }, {
                                        currentIndex: colIndex,
                                        prevActiveIndex: 0,
                                        nextActiveIndex: 0
                                    });
                                    old.columns.splice(colIndex, 1);
                                    old.columns.splice(prevActiveIndex, 0, col);
                                }));
                            }}/>
                        </Vertical>
                    </Horizontal>
                })}
            </Vertical>
        </Vertical>


        <Vertical vAlign={'center'}>
            <Button disabled={selectedRightColumns.length === 0} style={{marginBottom: 5}}
                    icon={<MdKeyboardArrowLeft style={{fontSize: '1.5rem'}}/>}
                    onClick={() => {
                        setState(produce(state => {
                            for (const colKey of selectedRightColumns) {
                                const index = state.columns.findIndex(col => col.key === colKey);
                                state.columns[index].active = true;
                            }
                        }));
                        setSelectedRightColumns([]);
                    }}
            />
            <Button disabled={selectedLeftColumns.length === 0}
                    icon={<MdKeyboardArrowRight style={{fontSize: '1.5rem'}}
                                                onClick={() => {
                                                    setState(produce(state => {
                                                        for (const colKey of selectedLeftColumns) {
                                                            const index = state.columns.findIndex(col => col.key === colKey);
                                                            state.columns[index].active = false;
                                                        }
                                                    }));
                                                    setSelectedLeftColumns([]);
                                                }}
                    />}/>


        </Vertical>

        <Vertical style={{border: '1px solid lightgrey', padding: '5px', paddingTop: '10px', width: 200}} m={5}
                  r={2}
                  position={'relative'}>
            <Vertical top={-18} left={10} p={5} position={'absolute'} backgroundColor={'#fff'} style={{zIndex: 1}}>In
                Active Columns</Vertical>


            {columns.filter(c => !c.active).map(col => {
                return <Horizontal key={col.key} style={{border: '1px solid lightgrey', padding: '3px 5px'}} m={5}
                                   r={2}>
                    <Checkbox checked={selectedRightColumns.includes(col.key)} onChange={(e) => {
                        setSelectedRightColumns((old: string[]) => {
                            if (e.target.checked && !old.includes(col.key)) {
                                return [...old, col.key];

                            }
                            if ((!e.target.checked) && old.includes(col.key)) {
                                return old.filter(key => key !== col.key)
                            }
                            return old;
                        })
                    }}>{col.name}</Checkbox>
                </Horizontal>
            })}

        </Vertical>
    </Horizontal>;
}

export default function ReportRoute() {
    const loaderData = useLoaderData<ReportModel & { providers: { queries: QueryModel[], renderer: RendererModel[] } }>();
    const [$state, setState, {
        Form,
        ActionStateValue
    }] = useRemixActionState<StateType>(loaderData);
    const id = loaderData.id;
    useEffect(() => {
        setState(loaderData);
    }, [id, loaderData, setState]);
    const errors = $state.current?.errors;

    return <Vertical h={'100%'}>
        <ActionStateValue selector={_ => $state?.current?.name || 'New Report'} render={(value) => {
            return <HeaderPanel title={value}/>
        }}/>

        <Vertical p={20} style={{flexGrow: 1}} overflow={'auto'}>
            <Form method={'post'}>
                <PlainWhitePanel>
                    <p style={{backgroundColor:'rgba(0,0,0,0.05)',borderLeft:'5px solid #BBB',padding:10,fontStyle:'italic'}}>Report is data that specifies how the report will be displayed. We can define the query that will be executed, as well as the columns that will be activated and their order. In addition, we can describe the paper size that will be used to print the report, as well as the size of each column based on the paper size.</p>

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
                        <Horizontal>
                            <Vertical style={{flexGrow: 1}} mR={10}>
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
                            </Vertical>
                            <Button htmlType={'submit'} name={'intent'} value={'runQuery'} type={'primary'} icon={<MdPlayArrow style={{marginRight:5,marginBottom:-5,fontSize:'1.2rem'}}/>}>Run Query</Button>
                        </Horizontal>
                    </Label>

                    <ActionStateValue selector={state => state?.columnFilters}
                                      render={(columnFilters?: ColumnFilterModel[]) => {
                                          const appliedFilters = columnFilters?.length;
                                          return <Collapse defaultActiveKey={['1']} ghost>
                                              <Collapse.Panel header={`There were ${appliedFilters} filters used.`}
                                                              key={1}>
                                                  <Vertical>
                                                      {columnFilters?.map((filter: ColumnFilterModel, index: number) => {
                                                          const isEquals = filter.filterCondition === 'equals';
                                                          const isFreeText = !isEquals;
                                                          return <FilterRowItemRenderer
                                                              queries={$state.current?.providers?.queries}
                                                              renderers={$state.current?.providers?.renderer || []}
                                                              queryId={$state.current?.queryId}
                                                              originalRecordSet={$state.current?.originalRecordSet}
                                                              filter={filter} setState={setState} isEquals={isEquals}
                                                              isFreeText={isFreeText} key={filter.id} rowIndex={index}/>
                                                      })}
                                                      <Horizontal hAlign={'right'}>
                                                          <Button type={"dashed"} style={{marginRight: 5}}
                                                                  htmlType={'submit'} name={'intent'}
                                                                  value={'applyFilter'} icon={<MdOutlineUpdate style={{fontSize:'1.2rem',marginBottom:-5,marginRight:5}}/>}>Apply Filter</Button>
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
                                                          }} icon={<IoMdAddCircleOutline style={{fontSize:'1.2rem',marginRight:5,marginBottom:-5}}/>}>Add Filter</Button>
                                                      </Horizontal>
                                                  </Vertical>
                                              </Collapse.Panel>
                                          </Collapse>
                                      }}/>

                    <ActionStateValue selector={state => state?.columns} render={(columns: ColumnModel[]) => {
                        return <Collapse defaultActiveKey={['1']} ghost>
                            <Collapse.Panel key={1} header={'Columns Order & Sort'}>
                                <ColumnsOrderAndSort columns={columns} setState={setState}/>
                            </Collapse.Panel>
                        </Collapse>
                    }}/>

                    <ActionStateValue selector={state => ({
                        columns: state?.columns.filter(c => c.active),
                        recordSet: state?.recordSet
                    })}
                                      render={({columns, recordSet}: { columns: ColumnModel[], recordSet: any[] }) => {
                                          const cols: ColumnsType<any> = columns?.map(col => {
                                              return {
                                                  title: col.name,
                                                  dataIndex: col.key,
                                                  key: col.key,
                                                  render: (value: any) => {
                                                      return <div dangerouslySetInnerHTML={{__html: value}}/>
                                                  }
                                              }
                                          });

                                          return <Table scroll={{x: true, scrollToFirstRowOnChange: true}}
                                                        columns={cols} dataSource={recordSet} size={"small"}/>
                                      }}>

                    </ActionStateValue>
                    <ActionStateValue selector={state => state?.id} render={(value) => {
                        const isNew = value === '';
                        return <Horizontal hAlign={'right'}>
                            {!isNew &&
                                <Button htmlType={'submit'} name={'intent'} type={"link"} value={'delete'}
                                        style={{marginRight: 5}} icon={<MdDeleteOutline style={{fontSize:'1.2rem',marginRight:5,marginBottom:-5}}/>}>Delete</Button>
                            }
                            <Button htmlType={'submit'} name={'intent'} type={"primary"}
                                    value={'save'} icon={<MdOutlineSave style={{fontSize:'1.2rem',marginRight:5,marginBottom:-5}}/>}>{isNew ? 'Save' : 'Update'}</Button>
                        </Horizontal>
                    }}/>
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
        return json({
            ...state,
            errors,
            recordSet: data.recordSet.map(mapFunction(qry.columns, db.renderer || [])).filter(filterFunction(state.columnFilters)),
            originalRecordSet: data.recordSet,
            columns: qry.columns.filter(c => c.enabled)
        });
    }

    if (intent === 'applyFilter') {
        const db = await loadDb();
        const qry = db.queries?.find(q => q.id === state.queryId);
        invariant(qry, 'Query data must not null');
        const columnFilters = state.columnFilters;
        const recordSet = state.originalRecordSet.map(mapFunction(qry.columns, db.renderer || [])).filter(filterFunction(columnFilters));
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
    if (intent === 'delete') {
        const db = await loadDb();
        db.reports = db.reports?.filter(d => d.id !== state?.id);
        await persistDb();
        return redirect('/reports/new');
    }
    return json({...state});
}


export const unstable_shouldReload: ShouldReloadFunction = ({url, prevUrl, submission, params}) => {
    invariant({url, prevUrl, submission, params});
    return false;
}