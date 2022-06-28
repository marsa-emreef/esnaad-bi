import React, {createContext} from "react";
import type {
    Dispatch,
    Observer,
    SetObserverAction} from "react-hook-useobserver";
import {
    emptyObserver,
    emptySetObserver,
    useObserver
} from "react-hook-useobserver";

interface Theme {
    backgroundColor: string;
    panelBackgroundColor: string;
    panelBorderColor: String;
}

const defaultTheme: Theme = {
    panelBackgroundColor: '#FFFFFF',
    panelBorderColor: '#F0F0F0',
    backgroundColor: '#EFF2F5'
}

interface ThemeContextType {
    $theme: Observer<Theme>,
    setTheme: Dispatch<SetObserverAction<Theme>>
}

export const ThemeContext = createContext<ThemeContextType>({
    $theme: emptyObserver,
    setTheme: emptySetObserver
});

export const ThemeProvider: React.FC<React.PropsWithChildren<any>> = (props) => {
    const [$theme, setTheme] = useObserver<Theme>(defaultTheme);
    return <ThemeContext.Provider value={{$theme, setTheme}}>
        {props.children}
    </ThemeContext.Provider>
}