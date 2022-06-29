import {Horizontal, Vertical} from "react-hook-components";
import * as React from "react";
import {useContext} from "react";
import {ThemeContext} from "~/components/Theme";
import {ObserverValue, useObserver} from "react-hook-useobserver";
import {MenuFoldOutlined, MenuUnfoldOutlined} from "@ant-design/icons";
import type {LinksFunction, LoaderFunction} from "@remix-run/node";
import {json} from "@remix-run/node";
import {MdOutlineQueryStats} from "react-icons/md";
import {Link, NavLink, Outlet, useFetcher, useLoaderData} from "@remix-run/react";
import {loadDb} from "~/db/db.server";
import {DbModel} from "~/db/DbModel";
import {Button, Divider, Menu} from "antd";
import {IoLogoWebComponent} from "react-icons/io5";
import {SiMicrosoftsqlserver} from "react-icons/si"

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

export const loader:LoaderFunction = async () => {
    const db = await loadDb();
    return json(db);
}



export default function AppShell() {
    const {$theme} = useContext(ThemeContext);
    const db = useLoaderData<DbModel>();
    const fetcher = useFetcher();
    const [$menuFold, setMenuFold] = useObserver(true);
    return <Vertical h={'100%'}>
        <Horizontal h={'100%'} backgroundColor={$theme.current.backgroundColor}>
            <ObserverValue observers={$menuFold} render={() => {
                const menuFold = $menuFold.current;
                return <Vertical backgroundColor={$theme.current.panelBackgroundColor}
                                 style={{
                                     boxShadow: `20px 0 20px -20px rgba(0,0,0,0.2)`,
                                     zIndex: 1,
                                     flexShrink : 0,
                                     width : menuFold ? 300 : 80,
                                     transition : 'width 300ms cubic-bezier(0,0,0.7,0.9)'
                                 }} >
                    <Vertical p={10} >
                        <Horizontal hAlign={menuFold ? 'right' : 'center'}>
                            <Button icon={menuFold ? <MenuFoldOutlined/> : <MenuUnfoldOutlined/>} onClick={() => setMenuFold(menuFold => !menuFold)}/>
                        </Horizontal>
                    </Vertical>
                    <Divider plain={true} style={{margin:0}}></Divider>
                    <Menu
                        mode="inline"
                        inlineCollapsed={!menuFold}
                        items={[
                            {
                                label : 'New Queries',
                                key : 'newQuery',
                                icon : <SiMicrosoftsqlserver/>
                            },
                            {
                                label:  <Link to={'/renderer/new'}>Renderers</Link>,
                                icon : <IoLogoWebComponent/>,
                                key : 'newRenderer',
                                children : db.renderer?.map(renderer => {
                                   return {
                                       label : <Link to={'/renderer/'+renderer.id}>{renderer.name}</Link>,
                                       key : renderer.id,
                                   }
                                })
                            }
                        ]}
                    />


                </Vertical>
            }}/>
            <Vertical style={{flexGrow: 1, overflow: 'auto'}} h={'100%'}>
                <Outlet/>
            </Vertical>
        </Horizontal>
    </Vertical>
}