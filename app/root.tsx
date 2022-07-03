import type {LinksFunction, LoaderFunction, MetaFunction} from "@remix-run/node";
import {json} from "@remix-run/node";
import {Links, LiveReload, Meta, Scripts, ScrollRestoration, useSearchParams,} from "@remix-run/react";
import styles from "antd/dist/antd.css";
import AppShell, {loader as appShellLoader} from "~/components/AppShell";
import {ThemeProvider} from "~/components/Theme";
import codeEditorStyles from "@uiw/react-textarea-code-editor/dist.css";
import paperCssStyles from "paper-css/paper.css";
import {Outlet} from "@remix-run/react";


export const meta: MetaFunction = () => ({
    charset: "utf-8",
    title: "New Remix App",
    viewport: "width=device-width,initial-scale=1",
});

export const links: LinksFunction = () => {
    return [
        {
            rel: "stylesheet",
            href: styles
        },
        {
            rel: "stylesheet",
            href: codeEditorStyles
        },
        {
            rel: "stylesheet",
            href: paperCssStyles
        }
    ]
}

export const loader: LoaderFunction = async (params) => {
    // if there is paper parameter then return empty json
    if (new URL(params.request.url).searchParams.get('paper')) {
        return json({});
    }
    return appShellLoader(params);
}


export default function App() {
    const [searchParams] = useSearchParams();
    const paper = searchParams.get('paper');
    return (
        <html lang="en">
        <head>
            <Meta/>
            <Links/>
            {paper && <style>{`@page { size: ${paper} }`}</style>}
        </head>
        <body className={paper || ''} style={{backgroundColor:'#EFF2F5'}}>
        <ThemeProvider>
            {paper && <Outlet/>}
            {!paper && <AppShell/>}
        </ThemeProvider>
        <ScrollRestoration/>
        <Scripts/>
        <LiveReload/>
        </body>
        </html>
    );
}


