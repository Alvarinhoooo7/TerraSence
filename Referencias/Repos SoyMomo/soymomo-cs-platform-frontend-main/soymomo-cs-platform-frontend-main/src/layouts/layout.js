/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import React from 'react';
import {
  SearchOutlined,
  ToolOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { Layout, Menu } from 'antd';
import { useNavigate } from   "react-router-dom";

const { Content, Sider } = Layout;

export default function MainLayout(props) {
  
  const menuItems = [
    {
      key: "search",
      icon: <SearchOutlined />,
      label: "Búsqueda",
      style: { color: 'white' }
    },
    {
      key: "tools",
      icon: <ToolOutlined />,
      label: "Herramientas",
      style: { color: 'white' }
    },
    {
      key: 'logout',
      icon: <LogoutOutlined/>,
      label: 'Cerrar Sesión',
      style: { color: 'white' }
    }
  ]
    
  const collapsed = true; // siempre colapsado (no cambia con hover)
  const navigate = useNavigate();
  const onClick = (e) => {
    if (e.key === 'search') {
        navigate('/');
    } else if (e.key === 'tools') {
        navigate('/herramientas');
    } else if (e.key === 'logout') {
        window.localStorage.removeItem('tokens');
        navigate('/login')
    }
  };
  

  const handleLogoClick = () => {
    navigate('/');
  }

  return (
    <Layout hasSider style={{ background: '#603BB0' }}>
      <Sider
        collapsed={collapsed}
        collapsedWidth="64"
        trigger={null}
        style={{ 
          background: '#603BB0',           
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0
        }}
      >
        <div style={{marginTop: '2vh', marginBottom: '2vh', marginRight: 'auto'}}>
            <div style={{ 
                display: 'flex',
                marginLeft: 'auto', 
                marginRight: 'auto', 
                flexDirection: 'column', 
                alignItems: 'center', 
                marginTop: '2rem', 
                marginBottom: '2rem'
            }}>
                <img src="/images/cs-soyMomoLogo.svg" alt="logo" width={40} height={40} onClick={handleLogoClick} style={{cursor: 'pointer', display: 'flex', 'alignItems': 'center', 'paddingLeft': 4}} />
            </div>
            <Menu theme='dark' onClick={onClick} selectedKeys={[props.currentView]} mode="inline" items={menuItems} style={{background: '#603BB0', width: 'auto'}} />
        </div>
      </Sider>
      <Layout className="site-layout" style={{ marginLeft: 64 }}>
        <Content style={{ width: 'auto', height: '100vh', background: '#603BB0' }}>
          <div style={{ background: '#f0f2f5', borderRadius: '30px', height: '96vh', margin: '2vh', padding: 14 }}>
                <div style={{ height: '100%', overflow: 'auto', scrollbarColor: 'dark' }}>
                {props.children}
                </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
