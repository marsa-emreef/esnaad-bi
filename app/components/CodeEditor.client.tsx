import type {TextareaCodeEditorProps} from "@uiw/react-textarea-code-editor";
import ReactCodeEditor from "@uiw/react-textarea-code-editor";
import React from "react";

const defaultStyle = {

    backgroundColor: "#fff",
    fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
    border: `1px solid #ccc`,
    borderRadius: 3
};

export default function CodeEditorClient(props: TextareaCodeEditorProps & React.RefAttributes<HTMLTextAreaElement>) {
    return <ReactCodeEditor
        {...props} style={{...defaultStyle, ...props.style}}
    />
}