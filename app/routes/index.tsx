import {links as AppShellLinks} from "~/components/AppShell";
import type {LinksFunction} from "@remix-run/node";
import {Vertical} from "react-hook-components";

export const links: LinksFunction = () => {
    return AppShellLinks()
}
export default function Index() {
    return <Vertical>
        This is shit
    </Vertical>;
}
