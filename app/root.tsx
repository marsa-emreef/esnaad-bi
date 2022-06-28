import type {MetaFunction} from "@remix-run/node";
import type {LinksFunction} from "@remix-run/node";
import {Links, LiveReload, Meta, Scripts, ScrollRestoration,} from "@remix-run/react";
import styles from "antd/dist/antd.css";
import AppShell from "~/components/AppShell";
import {ThemeProvider} from "~/components/Theme";

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
        }
    ]
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
