import {Horizontal, Vertical} from "react-hook-components";
import {HeaderPanel} from "~/components/HeaderPanel";
import {PlainWhitePanel} from "~/components/PlainWhitePanel";
import {useRemixActionState} from "remix-hook-actionstate";
import Label from "~/components/Label";
import {Button, Divider, Input, Select} from "antd";
import type {ColumnFilterModel, QueryModel, RendererModel, ReportModel} from "~/db/DbModel";
import type {LoaderFunction} from "@remix-run/node";
import {json} from "@remix-run/node";
import {loadDb} from "~/db/db.server";
import {useLoaderData} from "@remix-run/react";
import {v4} from "uuid";
import invariant from "tiny-invariant";


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
export default function ReportRoute() {
    const loaderData = useLoaderData<ReportModel & { providers: { queries: QueryModel[], renderer: RendererModel[] } }>();
    const [state, setState, {
        Form,
        useActionStateValue
    }] = useRemixActionState<ReportModel & { providers: { queries: QueryModel[], renderer: RendererModel[] } }>(loaderData);
    return <Vertical>
        <HeaderPanel title={'This is Report'}/>
        <Vertical p={20}>
            <Form method={'post'}>
                <PlainWhitePanel>
                    <Label label={'Name'}>
                        <Input value={useActionStateValue(val => val?.name)} onChange={(event) => {
                            setState(oldVal => {
                                return {...oldVal, name: event.target.value}
                            })
                        }}/>
                    </Label>
                    <Label label={'Description'}>
                        <Input value={useActionStateValue(val => val?.description)} onChange={(event) => {
                            setState(oldVal => {
                                return {...oldVal, description: event.target.value}
                            })
                        }}/>
                    </Label>
                    <Label label={'Query'}>
                        <Select value={useActionStateValue(val => val?.queryId)} onSelect={(value: string) => {
                            setState(oldVal => {
                                return {...oldVal, queryId: value}
                            });
                        }}>
                            {state?.providers.queries.map(q => {
                                return <Select.Option value={q.id} key={q.id}>{q.name}</Select.Option>
                            })}
                        </Select>
                    </Label>
                    <Horizontal hAlign={'right'}>
                        <Button htmlType={'submit'} name={'intent'} value={'runQuery'} type={'primary'}>Run Query</Button>
                    </Horizontal>
                    <Divider orientation={"left"} style={{fontSize: '1rem'}}>Filters</Divider>
                    {useActionStateValue(state => state?.columnFilters)?.map((filter: ColumnFilterModel) => {
                        return <Horizontal key={filter.id} mB={10}>
                            <Vertical w={100} style={{flexShrink: 0}}>
                                <Select value={filter.joinType} onSelect={(value:'and'|'or') => {
                                    setState(oldVal => {
                                        const newVal:ReportModel = JSON.parse(JSON.stringify(oldVal));
                                        const columnFilter = newVal.columnFilters.find(f => f.id === filter.id);
                                        invariant(columnFilter,'Column filter must not null');
                                        columnFilter.joinType = value;
                                        return newVal as any;
                                    });
                                }}>
                                    <Select.Option value={'and'}>And</Select.Option>
                                    <Select.Option value={'or'}>Or</Select.Option>
                                </Select>
                            </Vertical>
                            <Vertical w={'30%'} mL={5}>
                                <Select value={filter.columnKey} onSelect={(value: string) => {
                                    setState((oldVal) => {
                                        const newVal: ReportModel = JSON.parse(JSON.stringify(oldVal));
                                        const column = newVal.columnFilters.find(f => f.id === filter.id);
                                        invariant(column,'Column must not be empty');
                                        column.columnKey = value;
                                        return newVal as any;
                                    });
                                }}>
                                    {state?.providers.queries.find(qry => qry.id === state?.queryId)?.columns?.filter((col) => col.enabled)?.map(col => {
                                        return <Select.Option value={col.key} key={col.key}>{col.name}</Select.Option>
                                    })}
                                </Select>
                            </Vertical>
                            <Vertical w={'30%'} mL={5}>
                                <Select value={filter.filterCondition} onSelect={(value:any) => {
                                    setState(oldVal => {
                                        const newVal:ReportModel = JSON.parse(JSON.stringify(oldVal));
                                        const filterColumn = newVal.columnFilters.find(f => f.id === filter.id);
                                        invariant(filterColumn,'Filter column must not be empty');
                                        filterColumn.filterCondition = value;
                                        return newVal as any;
                                    })
                                }}>
                                    <Select.Option value={'contains'}>Contains</Select.Option>
                                    <Select.Option value={'startsWith'}>Starts With</Select.Option>
                                    <Select.Option value={'endsWith'}>Ends With</Select.Option>
                                    <Select.Option value={'equals'}>Equals</Select.Option>
                                    <Select.Option value={'greaterThan'}>Greater Than</Select.Option>
                                    <Select.Option value={'lessThan'}>Less Than</Select.Option>
                                </Select>
                            </Vertical>
                            <Vertical w={'30%'} mL={5}>
                                <Select>
                                    <Select.Option>Shit</Select.Option>
                                </Select>
                            </Vertical>
                        </Horizontal>
                    })}
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
                </PlainWhitePanel>
            </Form>
        </Vertical>
    </Vertical>
}