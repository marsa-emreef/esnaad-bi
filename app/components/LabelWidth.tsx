import React, {createContext} from "react";

export const LabelWidthContext = createContext(120)
export default function LabelWidth(props: React.PropsWithChildren<{ width: number }>) {
    return <LabelWidthContext.Provider value={props.width}>
        {props.children}
    </LabelWidthContext.Provider>
}