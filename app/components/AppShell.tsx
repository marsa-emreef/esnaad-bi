import {Horizontal, Vertical} from "react-hook-components";
import * as React from "react";
import {useContext} from "react";
import {ThemeContext} from "~/components/Theme";
import {ObserverValue, useObserver} from "react-hook-useobserver";
import {MenuFoldOutlined, MenuUnfoldOutlined} from "@ant-design/icons";
import type {LinksFunction} from "@remix-run/node";
import styles from "./AppShell.css";
import {MdOutlineQueryStats} from "react-icons/md";
import {NavLink, Outlet} from "@remix-run/react";

export const links: LinksFunction = () => {
    return [
        {
            rel: 'stylesheet',
            href: styles
        }
    ]
}


function MenuItem(props: { menuFold: boolean, isActive: boolean, label: string, icon: React.FC }) {
    const {menuFold, isActive} = props;
    return <Horizontal vAlign={'center'} data-sidemenubutton={'true'}>
        <Vertical style={{fontSize: '1.2rem'}} p={10}>
            <props.icon/>
        </Vertical>
        {menuFold &&
            <Vertical mL={10} w={'100%'}>
                {props.label}
            </Vertical>
        }
        {isActive && <Vertical style={{backgroundColor: 'blue'}} h={'100%'} w={2}>
            &nbsp;
        </Vertical>
        }
    </Horizontal>;
}

export default function AppShell() {
    const {$theme} = useContext(ThemeContext);
    const [$menuFold, setMenuFold] = useObserver(true);
    return <Vertical h={'100%'}>
        <Horizontal h={'100%'} backgroundColor={$theme.current.backgroundColor}>
            <ObserverValue observers={$menuFold} render={() => {
                const menuFold = $menuFold.current;
                return <Vertical backgroundColor={$theme.current.panelBackgroundColor}
                                 style={{
                                     boxShadow: `20px 0 20px -20px rgba(0,0,0,0.2)`,
                                     width: menuFold ? 300 : 40,
                                     zIndex: 1
                                 }}>
                    <Vertical data-sidemenubutton={'true'} hAlign={'right'}
                              style={{borderBottom: `1px solid ${$theme.current.panelBorderColor}`, fontSize: '1.3rem'}}
                              p={10}
                              onClick={() => setMenuFold(menuFold => !menuFold)}
                    >
                        {menuFold ? <MenuFoldOutlined/> : <MenuUnfoldOutlined/>}
                    </Vertical>
                    <Vertical>
                        <NavLink to={'/queries/new'}>
                            {({isActive}) => {
                                return <MenuItem menuFold={menuFold} isActive={isActive} label={'Add New Query'}
                                                 icon={MdOutlineQueryStats}/>
                            }}
                        </NavLink>
                        <NavLink to={'/renderer/new'}>
                            {({isActive}) => {
                                return <MenuItem menuFold={menuFold} isActive={isActive} label={'Add New Renderer'}
                                                 icon={MdOutlineQueryStats}/>
                            }}
                        </NavLink>
                    </Vertical>
                </Vertical>
            }}/>
            <Vertical style={{flexGrow: 1, overflow: 'auto'}} h={'100%'}>
                <Outlet/>
            </Vertical>
        </Horizontal>
    </Vertical>
}