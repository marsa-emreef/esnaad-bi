import {Horizontal, Vertical} from "react-hook-components";
import type {ActionFunction, LoaderFunction} from "@remix-run/node";
import {json, redirect} from "@remix-run/node";
import {loadDb, persistDb} from "~/db/db.server";
import {useLoaderData} from "@remix-run/react";
import type {RendererModel} from "~/db/DbModel";
import {actionStateFunction, useRemixActionState} from "~/remix-hook-actionstate";
import {HeaderPanel} from "~/components/HeaderPanel";
import {PlainWhitePanel} from "~/components/PlainWhitePanel";
import LabelWidth from "~/components/LabelWidth";
import Label from "~/components/Label";
import {Button, Input, Tooltip} from "antd";
import {CodeEditor} from "~/components/CodeEditor";
import {useEffect} from "react";
import invariant from "tiny-invariant";

export const loader: LoaderFunction = async ({params}) => {
    const id = params.id;
    const db = await loadDb();
    return json(db.renderer?.find(r => r.id === id));
}

function UpdateRendererRoute(){
    const renderer = useLoaderData<RendererModel>();
    const id = renderer.id;
    const [state, setState, {
        Form,
        useActionStateValue
    }] = useRemixActionState<RendererModel & { errors?: RendererModel }>(renderer);
    useEffect(() => {
        setState(renderer);
        // eslint-disable-next-line
    }, [id]);

    return <Vertical>
        <HeaderPanel title={state?.name || ''}/>
        <Vertical p={20}>
            <Form method={'post'}>
                <PlainWhitePanel>

                    <LabelWidth width={120}>
                        <Label label={'Name'}>
                            <Tooltip title={state?.errors?.name}>
                                <Input value={useActionStateValue(state => state?.name)} onChange={(e) => {
                                    setState(val => {
                                        return {...val, name: e.target.value}
                                    })
                                }}
                                       status={state?.errors?.name ? "error" : ''}
                                />
                            </Tooltip>
                        </Label>
                        <Label label={'Description'}>
                            <Tooltip title={state?.errors?.description}>
                                <Input value={state?.description} onChange={(e) => {
                                    setState(val => {
                                        return {...val, description: e.target.value}
                                    })
                                }}
                                       status={state?.errors?.description ? "error" : ''}
                                />
                            </Tooltip>
                        </Label>
                        <Label label={'Render Function'} vAlign={'top'}>
                            <Tooltip title={state?.errors?.rendererFunction}>
                                <CodeEditor language={'jsx'} placeholder="(value,record) => <div>{value}</div>"
                                            style={{
                                                height: 200,
                                                border: state?.errors?.rendererFunction ? `1px solid red` : `1px solid #ccc`
                                            }}
                                            value={state?.rendererFunction}
                                            onChange={(e) => {
                                                setState(val => {
                                                    return {...val, rendererFunction: e.target.value}
                                                })
                                            }}
                                />
                            </Tooltip>
                        </Label>
                    </LabelWidth>
                    <Horizontal hAlign={'right'}>
                        <Button htmlType={'submit'} name={'intent'} type={"link"} value={'delete'}
                                style={{marginRight: 5}}>Delete</Button>
                        <Button htmlType={'submit'} name={'intent'} type={"primary"} value={'update'}>Update</Button>
                    </Horizontal>
                </PlainWhitePanel>
            </Form>
        </Vertical>
    </Vertical>
}

export const action: ActionFunction = async ({request}) => {
    const formData = await request.formData();
    const state = await actionStateFunction<RendererModel>({formData});
    const errors: any = {};
    const intent = formData.get('intent');
    if (intent === 'update') {
        const db = await loadDb();
        const renderer = db.renderer?.find(d => d.id === state?.id);
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
        if (hasErrors) {
            return json({...state, errors});
        }
        invariant(renderer, 'Renderer cannot be empty');
        invariant(state?.rendererFunction, 'Renderer function cannot be empty');
        renderer.rendererFunction = state.rendererFunction;
        renderer.name = state.name;
        renderer.description = state.description;
        await persistDb();
    }
    if (intent === 'delete') {
        const db = await loadDb();
        db.renderer = db.renderer?.filter(d => d.id !== state?.id);
        await persistDb();
        return redirect('/');
    }
    return json({...state, errors});
}