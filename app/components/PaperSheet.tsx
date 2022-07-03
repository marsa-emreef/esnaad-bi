import {PropsWithChildren} from "react";

/** Padding area **/
export default function PaperSheet(props:PropsWithChildren<{padding:string}>){

    return <section className={'sheet'} style={{padding:props.padding}}>
        {props.children}
    </section>
}