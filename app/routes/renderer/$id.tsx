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
import {Button, Input, Tooltip} from "antd";
import {CodeEditor} from "~/components/CodeEditor";
import {useEffect} from "react";
import invariant from "tiny-invariant";
import {v4} from "uuid";

export const loader: LoaderFunction = async ({params}) => {
    const id = params.id;
    if (id === 'new') {
        const data: RendererModel = {
            id: '',
            name: '',
            description: '',
            rendererFunction: ''
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
                        <Label label={'Render Function'} vAlign={'top'}>
                            <ActionStateValue selector={state => state?.rendererFunction} render={(value) => {
                                return <Tooltip title={$state.current?.errors?.rendererFunction}>
                                    <CodeEditor language={'jsx'}  placeholder="(value,record) => <div>{value}</div>"
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
                            }} />

                        </Label>
                    </LabelWidth>
                    <ActionStateValue selector={state => state?.id} render={(value) =>{
                        const isNew = value === '';
                        return <Horizontal hAlign={'right'}>
                            {!isNew &&
                            <Button htmlType={'submit'} name={'intent'} type={"link"} value={'delete'}
                                    style={{marginRight: 5}}>Delete</Button>
                            }
                            <Button htmlType={'submit'} name={'intent'} type={"primary"} value={'save'}>{isNew ? 'Save' : 'Update'}</Button>
                        </Horizontal>
                    }} />

                </PlainWhitePanel>
            </Form>
        </Vertical>
    </Vertical>
}

function validateErrors(state: RendererModel) {
    const errors:any = {};
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
    return {hasErrors,errors};
}

export const action: ActionFunction = async ({request}) => {
    const formData = await request.formData();
    const state = await actionStateFunction<RendererModel>({formData});
    invariant(state,'State cannot be empty');
    const intent = formData.get('intent');
    if (intent === 'save') {
        const {hasErrors,errors} = validateErrors(state);
        if (hasErrors) {
            return json({...state, errors});
        }
        const db = await loadDb();
        const isNew = state?.id === '';
        invariant(state?.name, 'Name cannot be empty');
        let renderer:RendererModel|undefined = {
            id : v4(),
            name : state?.name,
            description : state?.description,
            rendererFunction : state?.rendererFunction
        }
        if(isNew){
            db.renderer = db.renderer || [];
            db.renderer?.push(renderer);
        }else{
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
    return json({...state, errors:{}});
}