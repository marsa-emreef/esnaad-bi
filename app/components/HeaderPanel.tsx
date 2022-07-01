import {useContext} from "react";
import {ThemeContext} from "~/components/Theme";
import {useMatches} from "@remix-run/react";
import {Horizontal, Vertical} from "react-hook-components";

function toPascalCase(string: string) {
    return `${string}`
        .toLowerCase()
        .replace(new RegExp(/[-_]+/, 'g'), ' ')
        .replace(new RegExp(/[^\w\s]/, 'g'), '')
        .replace(
            new RegExp(/\s+(.)(\w*)/, 'g'),
            ($1, $2, $3) => `${$2.toUpperCase() + $3}`
        )
        .replace(new RegExp(/\w/), s => s.toUpperCase());
}

export function HeaderPanel(props: { title: string }) {
    const {$theme} = useContext(ThemeContext);
    const matches = useMatches();
    const {pathname} = matches[matches.length - 1];
    const pathNames = pathname.split('/').filter(s => s).map(s => toPascalCase(s));

    return <Vertical backgroundColor={$theme.current.panelBackgroundColor} p={10} style={{boxShadow:'0px 20px 12px -20px rgba(0,0,0,0.1)',zIndex:1}}>
        <Horizontal pL={10} pR={10}>
            {pathNames.map((p, index) => {
                const isLastIndex = index === pathNames.length - 1;
                if (isLastIndex) {
                    return <Vertical key={p}>{p}</Vertical>
                }
                return <Horizontal key={p}>
                    <Vertical key={p} mR={5}>{p}</Vertical>
                    <Vertical mR={5}>{'/'}</Vertical>
                </Horizontal>
            })}
        </Horizontal>
        <Horizontal pL={10} pR={10}>
            <Vertical style={{fontSize: '1.5rem'}}>
                {props.title}
            </Vertical>
        </Horizontal>
    </Vertical>;
}