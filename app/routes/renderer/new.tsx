import {Horizontal, Vertical} from "react-hook-components";
import {PanelHeader} from "~/components/PanelHeader";
import {actionStateFunction, useRemixActionState} from "remix-hook-actionstate";
import LabelWidth from "~/components/LabelWidth";
import {PlainWhitePanel} from "~/components/PlainWhitePanel";
import Label from "~/components/Label";
import {Button, Input, Tooltip} from "antd";
import {CodeEditor} from "~/components/CodeEditor";
import type {ActionFunction, LoaderFunction} from "@remix-run/node";
import { json} from "@remix-run/node";
import {loadDb, persistDb} from "~/db/db.server";
import {useLoaderData} from "@remix-run/react";
import {v4} from "uuid";
import invariant from "tiny-invariant";
import type {RendererModel} from "~/db/DbModel";


export const loader: LoaderFunction = async () => {
    const db = await loadDb();
    return json(db)
}

export default function NewRendererRouter() {
    const db = useLoaderData();

    const [state, setState, {Form}] = useRemixActionState<RendererModel & { errors: RendererModel }>();

    return <Vertical>
        <PanelHeader title={'New Renderer'}/>
        <Vertical p={20}>
            <Form method={'post'}>
                <PlainWhitePanel>
                    <LabelWidth width={120}>
                        <Label label={'Name'}>
                            <Tooltip title={state?.errors?.name}>
                                <Input defaultValue={state?.name} onChange={(e) => {
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
                                <Input defaultValue={state?.description} onChange={(e) => {
                                    setState(val => {
                                        return {...val, description: e.target.value}
                                    })
                                }}
                                       status={state?.errors?.name ? "error" : ''}
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
                        <Button htmlType={'submit'} name={'intent'} type={"primary"} value={'save'}>Save</Button>
                    </Horizontal>
                </PlainWhitePanel>
            </Form>
        </Vertical>
    </Vertical>
}

export const action: ActionFunction = async ({request}) => {
    const formData = await request.formData();
    const actionState = await actionStateFunction<RendererModel>({formData});
    const db = await loadDb();
    let errors: any = {};
    if (formData.get('intent') === 'save') {
        const errors: any = {};
        if (actionState?.name === undefined) {
            errors.name = 'Name is mandatory';
        }
        if (actionState?.description === undefined) {
            errors.description = 'Description is mandatory';
        }
        if (actionState?.rendererFunction === undefined) {
            errors.rendererFunction = 'Render function is mandatory';
        }
        const hasErrors = Object.entries(errors).some(err => err);
        if (hasErrors) {
            return json({...actionState, errors});
        }
        invariant(actionState?.name, 'Name is mandatory');
        invariant(actionState?.description, 'Description is mandatory');
        invariant(actionState?.rendererFunction, 'Render function is mandatory');
        const hasId = actionState.id;
        db.renderer = db.renderer || [];
        if (hasId) {
            const persistedData = db.renderer.find(d => d.id === actionState.id);
            invariant(persistedData, 'Persisted data cannot be empty');
            persistedData.name = actionState.name;
            persistedData.rendererFunction = actionState.rendererFunction;
            persistedData.description = actionState.description;
        } else {
            db.renderer.push({
                name: actionState?.name,
                description: actionState?.description,
                rendererFunction: actionState?.rendererFunction,
                id: v4()
            });
        }
        await persistDb();
    }
    return json({...actionState, errors});
}
