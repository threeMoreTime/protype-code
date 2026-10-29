import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { Avatar, Breadcrumb, Button, ConfigProvider, Dropdown, Layout, Menu, Space, message } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { CloseOutlined, CustomerServiceOutlined, DownOutlined, MenuFoldOutlined, MenuUnfoldOutlined, SyncOutlined, UserOutlined } from '@ant-design/icons';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import i18next from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';
import WorkOrderListPage from '@/pages/workOrder/workOrderList';
import ImageAuditPage from '@/pages/workOrder/imageAudit';
import AdminTitle from '@/components/MainLayout/components/AdminTitle';
import { renderIcon } from '@/utils/icon';
import { mockControl } from './mocks/runtime.mjs';
import './shell.less';

declare global {
  interface Window {
    __FEEDBACK_STYLE_NONCE__: string;
    __feedbackMock: typeof mockControl;
  }
}

dayjs.locale('zh-cn');
const translations = i18next.createInstance();
translations.use(initReactI18next).init({ lng: 'zh-CN', fallbackLng: 'zh-CN', resources: { 'zh-CN': { translation: {} } }, interpolation: { escapeValue: false }, react: { useSuspense: false } });
window.__feedbackMock = mockControl;
// Preserve the source's visible request/loading lifecycle with synthetic latency.
mockControl.setDelay('/workOrder/list', 120);

const groups = [
  { key: 'statistics', label: '数据统计', icon: 'PieChart', children: ['AI客服统计', '历史数据统计', '客服状态历史记录'] },
  { key: 'workOrder', label: '工单管理', icon: 'FolderArrow', children: ['反馈列表', '我的任务', '反馈配置', '公告管理', '接单规则管理', '图片审核', '快捷回复'] },
  { key: 'evaluation', label: '服务评价管理', icon: 'Users', children: ['评价结果', '邀评配置'] },
  { key: 'knowledge', label: '知识库', icon: 'FolderArrow', children: [] },
  { key: 'system', label: '系统管理', icon: 'Controls', children: ['游戏管理', '用户管理', '角色管理', '玩家管理', '客服管理', '系统设置', '菜单管理', '告警配置'] },
];
const menuIcons: Record<string, string> = { 'AI客服统计': 'LineChart', '历史数据统计': 'BarChart', '客服状态历史记录': 'List', '反馈列表': 'File', '我的任务': 'Ticket', '反馈配置': 'Processor', '公告管理': 'Document', '接单规则管理': 'Document', '图片审核': 'Security', '快捷回复': 'Clipboard', '游戏管理': 'Computer', '用户管理': 'UserOutlined', '角色管理': 'Team', '玩家管理': 'Profile', '客服管理': 'Server', '系统设置': 'Processor', '菜单管理': 'FolderOpen', '告警配置': 'Navigation' };

// Only the feedback route is exported. Other menu entries retain the original shell's
// appearance but never route to the private system or impersonate another module.
function feedbackMenuItems(onAudit: () => void, onFeedback: () => void) {
  return groups.map(group => ({
    key: group.key,
    icon: renderIcon(group.icon),
    label: <span className="a-black">{group.label}</span>,
    children: group.children.length ? group.children.map(label => ({
      key: label,
      label: <a className="a-black select-none" onClick={() => { if (label === '图片审核') onAudit(); else if (label === '反馈列表') onFeedback(); else message.info('本次原型范围为反馈列表'); }}>{label}</a>,
      icon: menuIcons[label] ? renderIcon(menuIcons[label]) : undefined,
    })) : [{ key: 'knowledge-placeholder', label: '知识库', disabled: true }],
  }));
}

const statusMeta = {
  1: { label: '在线', className: 'bg-emerald-500 text-white shadow-sm' },
  2: { label: '离线', className: 'bg-slate-400 text-white' },
  3: { label: '挂起', className: 'bg-orange-500 text-white shadow-sm' },
};

function HeaderControllers() {
  useSyncExternalStore(mockControl.subscribe, mockControl.getRevision);
  const status = mockControl.snapshot().actorStatus as 1 | 2 | 3;
  const meta = statusMeta[status];
  return <div className="flex items-center"><Space>
    <Button className="hidden sm:inline-flex" onClick={() => message.info('接待模拟不在本次反馈列表原型范围内')}><span className="!flex items-center justify-center gap-1.5"><CustomerServiceOutlined /><span>接待模拟</span></span></Button>
    <Dropdown trigger={['click']} menu={{ items: ([1, 2, 3] as const).map(value => ({ key: String(value), label: statusMeta[value].label, disabled: value === status, onClick: () => { mockControl.setActorStatus(value); message.success(`已切换为${statusMeta[value].label}`); } })) }}>
      <div role="button" tabIndex={0} className={`hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium cursor-pointer select-none transition-all hover:opacity-90 ${meta.className}`}><span className="w-2 h-2 rounded-full bg-white/90 shrink-0" />{meta.label}<DownOutlined className="text-[10px] text-white/90" /></div>
    </Dropdown>
    <Dropdown trigger={['click']} overlayStyle={{ minWidth: 150 }} menu={{ items: [{ key: 'logout', danger: true, label: '退出', onClick: () => message.info('当前是离线 Mock 原型，无真实登录会话') }] }}>
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-100 transition-all duration-200 select-none group">
        <Avatar size={30} className="bg-primary flex items-center justify-center shadow-sm group-hover:shadow transition-all" icon={<UserOutlined />} />
        <div className="flex-col items-start leading-[1.2] mx-1 hidden sm:flex"><span className="text-[13px] font-medium text-gray-700">客服甲</span><span className="text-[10px] text-gray-400">演示管理员</span></div><DownOutlined className="text-[10px] text-gray-400 transition-transform group-hover:translate-y-0.5" />
      </div>
    </Dropdown>
  </Space></div>;
}

function FeedbackShell() {
  const revision = useSyncExternalStore(mockControl.subscribe, mockControl.getRevision);
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState(['statistics', 'workOrder', 'evaluation', 'system']);
  const [refreshKeys, setRefreshKeys] = useState({ feedback: 0, audit: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [auditOpened, setAuditOpened] = useState(false);
  const auditActive = location.pathname === '/workOrder/imageAudit';
  const activeTitle = auditActive ? '图片审核' : '反馈列表';
  const openAudit = () => { setAuditOpened(true); navigate('/workOrder/imageAudit'); };
  useEffect(() => {
    const target = mockControl.getNavigation();
    if (!target) return;
    setAuditOpened(true);
    navigate(target.path + target.search);
    mockControl.clearNavigation();
  }, [revision, navigate]);
  const tabs = [{ key: 'feedback', path: '/workOrder/workOrderList', title: '反馈列表' }, ...(auditOpened ? [{ key: 'audit', path: '/workOrder/imageAudit', title: '图片审核' }] : [])];
  return <Layout className="w-full h-screen">
    <Layout.Sider style={{ overflow: 'auto', paddingTop: 10, transition: 'all .2s' }} className="border-r border-[#eee]" collapsed={collapsed} width={260} theme="light">
      <div className="logo flex justify-center h-[30px]" /><AdminTitle menuCollapsed={collapsed} />
      <div className="menu-container overflow-y-auto scrollbar" style={{ height: 'calc(100vh - 90px)' }}>
        <Menu className="!border-none" selectedKeys={[activeTitle]} openKeys={openKeys} onOpenChange={setOpenKeys} style={{ padding: '0px 6px' }} items={feedbackMenuItems(openAudit, () => navigate('/workOrder/workOrderList'))} mode="inline" />
      </div>
    </Layout.Sider>
    <Layout><div className="body w-full h-full overflow-auto bg-white">
      <header className="h-[60px] flex justify-between items-center px-[15px]">
        <div className="flex items-center"><div className="cursor-pointer" style={{ color: '#637381', marginRight: 16 }} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <MenuUnfoldOutlined style={{ fontSize: 18 }} /> : <MenuFoldOutlined style={{ fontSize: 18 }} />}</div>
          <Breadcrumb className="py-2" items={[{ title: <Dropdown trigger={['click']} placement="bottomLeft" menu={{ items: groups.find(group => group.key === 'workOrder')!.children.map(label => ({ key: label, label, onClick: () => { if (label === '图片审核') openAudit(); else if (label === '反馈列表') navigate('/workOrder/workOrderList'); else message.info('本次原型范围为反馈列表'); } })) }}><span className="text-[#888] cursor-pointer" onClick={event => event.preventDefault()}>工单管理 <DownOutlined /></span></Dropdown> }, { title: activeTitle }]} />
        </div><HeaderControllers />
      </header>
      <div className="pages-tabs h-[37px] bg-[#fff]"><div className="tabs w-full h-full flex border-b border-gray-200">
        <div className="flex-1" style={{ width: 'calc(100% - 84px)' }}><div className="flex overflow-x-auto scrollbar-hide pl-2">{tabs.map(tab => <Dropdown key={tab.key} trigger={['contextMenu']} menu={{ items: ['关闭其他', '关闭左侧', '关闭右侧'].map(label => ({ key: label, label, disabled: true })) }}><div data-key={tab.path} onClick={() => navigate(tab.path)} className={`group flex-shrink-0 flex items-center h-9 min-w-[90px] px-4 mr-1 rounded-t-lg transition-all duration-200 cursor-pointer bg-gray-100 ${activeTitle === tab.title ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'}`}><div className="flex-1 flex items-center justify-center"><span className="flex-shrink-0 select-none" data-title={tab.title}>{tab.title}</span>{tabs.length > 1 && <div className={`tab-close-btn flex-shrink-0 cursor-pointer overflow-hidden transition-all duration-200 ${activeTitle === tab.title ? 'opacity-100 w-5 pl-1.5' : 'opacity-0 w-0'} group-hover:opacity-100 group-hover:w-5 group-hover:pl-1.5`} onClick={event => { event.stopPropagation(); if (tab.key === 'audit') { setAuditOpened(false); navigate('/workOrder/workOrderList'); } }}><CloseOutlined style={{ fontSize: 14 }} /></div>}</div></div></Dropdown>)}</div></div>
        <div className="w-[84px] h-full flex justify-around items-center flex-shrink-0"><div className="w-[36px] h-[34px] rounded bg-[#FDFCFC]" onClick={() => { setRefreshKeys(keys => ({ ...keys, [auditActive ? 'audit' : 'feedback']: keys[auditActive ? 'audit' : 'feedback'] + 1 })); setRefreshing(true); setTimeout(() => setRefreshing(false), 1000); }}><SyncOutlined className={`text-[16px] ${refreshing ? 'animate-spin' : ''}`} /></div></div>
      </div></div>
      <div className="body w-full bg-white" style={{ overflow: 'hidden', height: 'calc(100vh - 97px)' }}><div className="animation-wrapper scrollbar w-full h-full overflow-y-auto overflow-x-hidden"><div className="cache-component active h-full"><div className="layout-stretch mx-auto h-full" style={{ maxWidth: '100%' }}><div className="h-full" style={{ display: auditActive ? 'none' : 'block' }}><WorkOrderListPage key={refreshKeys.feedback} /></div>{auditOpened && <div className="h-full" style={{ display: auditActive ? 'block' : 'none' }}><ImageAuditPage key={refreshKeys.audit} /></div>}</div></div></div></div>
    </div></Layout>
  </Layout>;
}

createRoot(document.getElementById('root')!).render(<I18nextProvider i18n={translations}><ConfigProvider locale={zhCN} csp={{ nonce: window.__FEEDBACK_STYLE_NONCE__ }}><MemoryRouter initialEntries={['/workOrder/workOrderList']}><FeedbackShell /></MemoryRouter></ConfigProvider></I18nextProvider>);
