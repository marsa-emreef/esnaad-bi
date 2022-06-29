import {Vertical} from "react-hook-components";
import {LoaderFunction} from "@remix-run/node";
import {loadDb} from "~/db/db.server";
import {useLoaderData} from "@remix-run/react";
import {RendererModel} from "~/db/DbModel";

export const loader:LoaderFunction = async ({params}) => {
    const id = params.id;
    const db = await loadDb();
    return JSON.stringify(db.renderer?.find(r => r.id === id));
}

export default function UpdateRendererRoute(){
    const loaderData = useLoaderData<RendererModel>();
    return <Vertical>
        KONTOL KUDA
        {JSON.stringify(loaderData)}
    </Vertical>
}