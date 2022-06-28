import {Vertical} from "react-hook-components";
import {PanelHeader} from "~/components/PanelHeader";
import {Form} from "@remix-run/react";

export default function NewRendererRouter() {
    return <Vertical>
        <PanelHeader title={'New Renderer'}/>
        <Vertical p={20}>
            <Form method={'post'}>

            </Form>
        </Vertical>
    </Vertical>
}
