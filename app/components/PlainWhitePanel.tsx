import React, {useContext} from "react";
import {Vertical} from "react-hook-components";
import {ThemeContext} from "~/components/Theme";

export function PlainWhitePanel(props: React.PropsWithChildren<any>) {
    const {$theme} = useContext(ThemeContext);
    return <Vertical r={5} p={10} backgroundColor={$theme.current.panelBackgroundColor}
                     style={{boxShadow: '0px 10px 10px -10px rgba(0,0,0,0.3)'}}>
        {props.children}
    </Vertical>
}