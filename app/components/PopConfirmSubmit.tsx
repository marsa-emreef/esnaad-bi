import {Popconfirm, PopconfirmProps} from "antd";
import {PropsWithChildren, useRef,MutableRefObject} from "react";
import {Vertical} from "react-hook-components";
import invariant from "tiny-invariant";
import {SubmitOptions} from "@remix-run/react";
import {useRemixActionStateInForm} from "~/remix-hook-actionstate";

export default function PopConfirmSubmit(props: PropsWithChildren<PopconfirmProps&SubmitOptions>){
    const [,,{submit}] = useRemixActionStateInForm();
    const buttonRef = useRef<HTMLButtonElement>(null);
    return <Popconfirm {...props} onConfirm={(e) => {
        if(props.onConfirm){
            props.onConfirm(e);
        }
        if(!e?.isDefaultPrevented()){
            submit(buttonRef.current,{
                action:props.action,
                encType:props.encType,
                method:props.method,
                replace:props.replace
            })
        }
    }}>
        <Vertical onClick={(event) => {
            const sourceButton = (event.currentTarget as HTMLDivElement).querySelector('button');
            invariant(sourceButton,'Button is not available in the PopupConfirm');
            (buttonRef as MutableRefObject<HTMLButtonElement>).current = sourceButton;
        }}>
        {props.children}
        </Vertical>
    </Popconfirm>
}