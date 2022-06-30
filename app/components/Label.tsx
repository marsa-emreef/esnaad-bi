import {Horizontal, Vertical} from "react-hook-components";
import React, {useContext} from "react";
import {LabelWidthContext} from "~/components/LabelWidth";

export default function Label(props: React.PropsWithChildren<{ label: string, vAlign?: 'top' | 'bottom' | 'center' }>) {
    const labelWidth = useContext(LabelWidthContext);
    return <Horizontal vAlign={props.vAlign ?? 'center'} mB={10}>
        <Vertical style={{flexShrink: 0}} w={labelWidth}>
            <Horizontal>
                {props.label}
                <Vertical mL={5}>:</Vertical>
            </Horizontal>

        </Vertical>
        <Vertical mL={10} w={'100%'}>
            {props.children}
        </Vertical>
    </Horizontal>
}