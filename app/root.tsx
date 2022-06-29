import type {LoaderFunction, MetaFunction} from "@remix-run/node";
import type {LinksFunction} from "@remix-run/node";
import {Links, LiveReload, Meta, Scripts, ScrollRestoration,} from "@remix-run/react";
import styles from "antd/dist/antd.css";
import AppShell,{loader as appShellLoader} from "~/components/AppShell";
import {ThemeProvider} from "~/components/Theme";
import codeEditorStyles from "@uiw/react-textarea-code-editor/dist.css";

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
        }
    ]
}
export const loader:LoaderFunction = async (params) => {
    return appShellLoader(params);
}

export default function App() {
    return (
        <html lang="en">
        <head>
            <Meta/>
            <Links/>
        </head>
        <body>
        <ThemeProvider>
            <AppShell/>
        </ThemeProvider>
        <ScrollRestoration/>
        <Scripts/>
        <LiveReload/>
        </body>
        </html>
    );
}
