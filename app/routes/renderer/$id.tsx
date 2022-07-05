import {Horizontal, Vertical} from "react-hook-components";
import type {ActionFunction, LoaderFunction} from "@remix-run/node";
import {json, redirect} from "@remix-run/node";
import {loadDb, persistDb} from "~/db/db.server";
import {useLoaderData} from "@remix-run/react";
import type {RendererModel} from "~/db/model";
import {actionStateFunction, useRemixActionState} from "~/remix-hook-actionstate";
import {HeaderPanel} from "~/components/HeaderPanel";
import {PlainWhitePanel} from "~/components/PlainWhitePanel";
import LabelWidth from "~/components/LabelWidth";
import Label from "~/components/Label";
import {Button, Input, Select, Tooltip} from "antd";
import {CodeEditor} from "~/components/CodeEditor";
import {useEffect} from "react";
import invariant from "tiny-invariant";
import {v4} from "uuid";
import {MdDeleteOutline, MdOutlineSave} from "react-icons/md";

export const loader: LoaderFunction = async ({params}) => {
    const id = params.id;
    if (id === 'new') {
        const data: RendererModel = {
            id: '',
            name: '',
            description: '',
            rendererFunction: '(cellData,rowData,rowIndex,gridData,columnKey,columnName,context) => cellData',
            typeOf: 'string'
        };
        return json(data);
    }
    const db = await loadDb();
    return json(db.renderer?.find(r => r.id === id));
}

export default function UpdateRendererRoute() {
    const renderer = useLoaderData<RendererModel>();
    const id = renderer.id;
    const [$state, setState, {
        Form,
        ActionStateValue
    }] = useRemixActionState<RendererModel & { errors?: RendererModel }>(renderer);

    useEffect(() => {
        setState(renderer);
        // eslint-disable-next-line
    }, [id]);

    return <Vertical>
        <ActionStateValue selector={state => state?.name} render={(value) => {
            return <HeaderPanel title={value || ''}/>
        }}/>
        <Vertical p={20}>
            <Form method={'post'}>
                <PlainWhitePanel>
                    <p style={{backgroundColor:'rgba(0,0,0,0.05)',borderLeft:'5px solid #BBB',padding:10,fontStyle:'italic'}}>A renderer is an element used to render data.<br/> We can format a column whose starting value is a string as a date, a number, or a graph using the renderer.</p>
                    <LabelWidth width={120}>
                        <Label label={'Name'}>
                            <ActionStateValue selector={state => state?.name} render={(value) => {
                                return <Tooltip title={$state.current?.errors?.name}>
                                    <Input value={value} onChange={(e) => {
                                        setState(val => {
                                            return {...val, name: e.target.value}
                                        })
                                    }}
                                           status={$state.current?.errors?.name ? "error" : ''}
                                    />
                                </Tooltip>
                            }}/>
                        </Label>
                        <Label label={'Description'}>
                            <ActionStateValue selector={state => state?.description} render={(value) => {
                                return <Tooltip title={$state.current?.errors?.description}>
                                    <Input value={value} onChange={(e) => {
                                        setState(val => {
                                            return {...val, description: e.target.value}
                                        })
                                    }}
                                           status={$state.current?.errors?.description ? "error" : ''}
                                    />
                                </Tooltip>
                            }}/>
                        </Label>
                        <Label label={'Type Of'}>
                            <ActionStateValue selector={state => state?.typeOf} render={(value) => {
                                return <Tooltip title={$state.current?.errors?.typeOf}>
                                    <Select value={value}>
                                        <Select.Option value={'number'}>Number</Select.Option>
                                        <Select.Option value={'string'}>String</Select.Option>
                                        <Select.Option value={'date'}>Date</Select.Option>
                                        <Select.Option value={'boolean'}>Boolean</Select.Option>
                                    </Select>
                                </Tooltip>
                            }}>
                            </ActionStateValue>
                        </Label>
                        <Label label={'Render Function'} vAlign={'top'}>
                            <ActionStateValue selector={state => state?.rendererFunction} render={(value) => {
                                return <Tooltip title={$state.current?.errors?.rendererFunction}>
                                    <CodeEditor language={'jsx'}
                                                placeholder="(cellData,rowData,rowIndex,gridData,columnKey,columnName,context) => cellData"
                                                style={{
                                                    height: 200,
                                                    border: $state.current?.errors?.rendererFunction ? `1px solid red` : `1px solid #ccc`
                                                }}
                                                value={value}
                                                onChange={(e) => {
                                                    setState(val => {
                                                        return {...val, rendererFunction: e.target.value}
                                                    })
                                                }}
                                    />
                                </Tooltip>
                            }}/>

                        </Label>
                    </LabelWidth>
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

function validateErrors(state: RendererModel) {
    const errors: any = {};
    if (!state?.typeOf) {
        errors.typeOf = 'Type of is mandatory';
    }
    if (!state?.name) {
        errors.name = 'Name is mandatory'
    }
    if (!state?.description) {
        errors.description = 'Description is mandatory'
    }
    if (!state?.rendererFunction) {
        errors.rendererFunction = 'Renderer function is mandatory'
    }
    const hasErrors = Object.entries(errors).some(err => err);
    return {hasErrors, errors};
}

export const action: ActionFunction = async ({request}) => {
    const formData = await request.formData();
    const state = await actionStateFunction<RendererModel>({formData});
    invariant(state, 'State cannot be empty');
    const intent = formData.get('intent');
    if (intent === 'save') {
        const {hasErrors, errors} = validateErrors(state);
        if (hasErrors) {
            return json({...state, errors});
        }
        const db = await loadDb();
        const isNew = state?.id === '';
        invariant(state?.name, 'Name cannot be empty');
        let renderer: RendererModel | undefined = {
            id: v4(),
            name: state?.name,
            description: state?.description,
            rendererFunction: state?.rendererFunction,
            typeOf: state?.typeOf
        }
        if (isNew) {
            db.renderer = db.renderer || [];
            db.renderer?.push(renderer);
        } else {
            renderer = db.renderer?.find(d => d.id === state?.id);
            invariant(renderer, 'Renderer cannot be empty');
            renderer.rendererFunction = state.rendererFunction;
            renderer.name = state.name;
            renderer.description = state.description;
        }
        await persistDb();
    }
    if (intent === 'delete') {
        const db = await loadDb();
        db.renderer = db.renderer?.filter(d => d.id !== state?.id);
        await persistDb();
        return redirect('/renderer/new');
    }
    return json({...state, errors: {}});
}