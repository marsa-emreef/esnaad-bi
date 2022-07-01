import {Horizontal, Vertical} from "react-hook-components";
import * as React from "react";
import {useContext} from "react";
import {ThemeContext} from "~/components/Theme";
import {ObserverValue, useObserver} from "react-hook-useobserver";
import {MenuFoldOutlined, MenuUnfoldOutlined} from "@ant-design/icons";
import type {LoaderFunction} from "@remix-run/node";
import {json} from "@remix-run/node";
import {Link, Outlet, useLoaderData} from "@remix-run/react";
import {loadDb} from "~/db/db.server";
import type {DbModel} from "~/db/model";
import {Button, Divider, Menu} from "antd";
import {IoLogoWebComponent} from "react-icons/io5";
import {SiMicrosoftsqlserver} from "react-icons/si"
import {MdOutlineTableView} from "react-icons/md";

export const loader: LoaderFunction = async () => {
    const db = await loadDb();
    return json(db);
}


export default function AppShell() {
    const {$theme} = useContext(ThemeContext);
    const db = useLoaderData<DbModel>();

    const [$menuFold, setMenuFold] = useObserver(true);
    return <Vertical h={'100%'}>
        <Horizontal h={'100%'} backgroundColor={$theme.current.backgroundColor}>
            <ObserverValue observers={$menuFold} render={() => {
                const menuFold = $menuFold.current;
                return <Vertical backgroundColor={$theme.current.panelBackgroundColor}
                                 style={{
                                     boxShadow: `20px 0 20px -20px rgba(0,0,0,0.15)`,
                                     zIndex: 2,
                                     flexShrink: 0,
                                     width: menuFold ? 300 : 80,
                                     transition: 'width 300ms cubic-bezier(0,0,0.7,0.9)'
                                 }}>
                    <Vertical p={10}>
                        <Horizontal hAlign={menuFold ? 'right' : 'center'}>
                            <Button icon={menuFold ? <MenuFoldOutlined/> : <MenuUnfoldOutlined/>}
                                    onClick={() => setMenuFold(menuFold => !menuFold)}/>
                        </Horizontal>
                    </Vertical>
                    <Divider plain={true} style={{margin: 0}}/>
                    <Vertical style={{flexGrow:1,overflow:'auto'}}>
                    <Menu
                        mode="inline"
                        inlineCollapsed={!menuFold}
                        items={[
                            {
                                label: <Link to={'/reports/new'}>Reports</Link>,
                                key:'report',
                                icon : <MdOutlineTableView/>,
                                children: db.reports?.map(report => {
                                    return {
                                        label: <Link to={'/reports/' + report.id}>{report.name}</Link>,
                                        key: report.id,
                                    }
                                })
                            },
                            {
                                label: <Link to={'/queries/new'}>Queries</Link>,
                                key: 'newQuery',
                                icon: <SiMicrosoftsqlserver/>,
                                children: db.queries?.map(query => {
                                    return {
                                        label: <Link to={'/queries/' + query.id}>{query.name}</Link>,
                                        key: query.id,
                                    }
                                })
                            },
                            {
                                label: <Link to={'/renderer/new'}>Renderers</Link>,
                                icon: <IoLogoWebComponent/>,
                                key: 'newRenderer',
                                children: db.renderer?.map(renderer => {
                                    return {
                                        label: <Link to={'/renderer/' + renderer.id}>{renderer.name}</Link>,
                                        key: renderer.id,
                                    }
                                })
                            }
                        ]}
                    />
                    </Vertical>

                </Vertical>
            }}/>
            <Vertical style={{flexGrow: 1, overflow: 'auto'}} h={'100%'}>
                <Outlet/>
            </Vertical>
        </Horizontal>
    </Vertical>
}