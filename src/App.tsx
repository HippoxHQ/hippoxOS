import React, { useState, useEffect } from 'react';
import ChatPanel from './components/ChatPanel';
import ResizablePanels from './components/ResizablePanels';
import Sidebar from './components/Sidebar';
import TerminalPanel from './components/TerminalPanel';
import MenuPanel, { MenuPanelView } from './components/MenuPanel';
import TopBar from './components/TopBar';
import BottomBar from './components/BottomBar';
import { useTranslation } from './hooks/useTranslation';
import { Theme, Language, ExecutionLog, ChatMessage } from './type';
import { SettingsSubView } from './components/MenuPanel/SettingsPanel';

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('hippox-theme') as Theme;
    return saved || 'light';
  });
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('hippox-language') as Language;
    return saved || 'en';
  });
  const { t } = useTranslation(language);
  const [menuPanelView, setMenuPanelView] = useState<MenuPanelView | null>(null);
  const [settingsSubView, setSettingsSubView] = useState<SettingsSubView>('aiModel');
  const [menuPanelWidth, setMenuPanelWidth] = useState<number>(320);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>(() => [
    {
      id: '1',
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: t('logs.init'),
      details: t('logs.initDetail', { count: 156, memory: '42MB', dir: '/home/user' }),
      duration: 340
    },
    {
      id: '2',
      timestamp: new Date().toLocaleTimeString(),
      level: 'success',
      message: t('logs.ready'),
      details: t('logs.readyDetail'),
    },
    {
      id: '3',
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: t('logs.decision'),
      details: t('logs.decisionDetail', { count: 156 }),
      duration: 12
    },
  ]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: t('welcome.message'),
      timestamp: new Date().toLocaleTimeString()
    }
  ]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hippox-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('hippox-language', language);
  }, [language]);
  const appendLog = (log: Omit<ExecutionLog, 'id' | 'timestamp'>) => {
    const newLog: ExecutionLog = {
      ...log,
      id: Date.now().toString() + Math.random(),
      timestamp: new Date().toLocaleTimeString()
    };
    setExecutionLogs(prev => [...prev, newLog]);
  };
  const handleMenuClick = (view: string, subView?: string) => {
    if (view === 'settings') {
      setMenuPanelView('settings');
      setSettingsSubView((subView as SettingsSubView) || 'aiModel');
    } else if (view === 'dashboard') {
      setMenuPanelView(null);
    } else {
      setMenuPanelView(view as MenuPanelView);
    }
  };
  const closeMenuPanel = () => {
    setMenuPanelView(null);
  };
  const handleSaveConfig = (config: any) => {
    console.log('Save config:', config);
    appendLog({
      level: 'success',
      message: '配置已保存',
      details: JSON.stringify(config, null, 2)
    });
  };
  const handleSendMessage = async (userMessage: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toLocaleTimeString()
    };
    setChatMessages(prev => [...prev, userMsg]);
    appendLog({
      level: 'info',
      message: t('logs.received'),
      details: `${t('logs.content')}: ${userMessage.substring(0, 80)}${userMessage.length > 80 ? '...' : ''}`
    });
    appendLog({
      level: 'process',
      message: t('logs.deciding'),
      details: t('logs.decidingDetail')
    });
    setTimeout(() => {
      let replyText = '';
      let skillUsed = '';
      if (userMessage.toLowerCase().includes('搜索') || userMessage.toLowerCase().includes('search')) {
        skillUsed = 'WebSearch Skill';
        replyText = t('skills.search', { query: userMessage });
        appendLog({
          level: 'success',
          message: `✅ ${t('logs.execSkill')}: ${skillUsed}`,
          details: t('logs.searchDetail')
        });
      } else if (userMessage.toLowerCase().includes('文件') || userMessage.toLowerCase().includes('file')) {
        skillUsed = 'FileProcessor Skill';
        replyText = t('skills.file');
        appendLog({
          level: 'success',
          message: `✅ ${t('logs.execSkill')}: ${skillUsed}`,
          details: t('logs.fileDetail')
        });
      } else if (userMessage.toLowerCase().includes('代码') || userMessage.toLowerCase().includes('code')) {
        skillUsed = 'CodeExecutor Skill';
        replyText = t('skills.code');
        appendLog({
          level: 'success',
          message: `✅ ${t('logs.execSkill')}: ${skillUsed}`,
          details: t('logs.codeDetail')
        });
      } else {
        skillUsed = t('skills.dialog');
        replyText = t('skills.default', { message: userMessage });
        appendLog({
          level: 'info',
          message: t('logs.defaultPath'),
          details: t('logs.defaultPathDetail')
        });
      }
      const assistantMsg: ChatMessage = {
        id: Date.now().toString() + '-reply',
        role: 'assistant',
        content: replyText,
        timestamp: new Date().toLocaleTimeString()
      };
      setChatMessages(prev => [...prev, assistantMsg]);
      appendLog({
        level: 'success',
        message: t('logs.responseGenerated'),
        details: `${t('logs.responseLength')}: ${replyText.length} ${t('logs.chars')}`
      });
    }, 800);
  };

  const clearLogs = () => {
    setExecutionLogs([]);
    appendLog({
      level: 'info',
      message: t('logs.cleared'),
      details: t('logs.clearedDetail')
    });
  };

  const resetSession = () => {
    setChatMessages([
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: t('session.reset'),
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
    appendLog({
      level: 'info',
      message: t('logs.reset'),
      details: t('logs.resetDetail')
    });
    appendLog({
      level: 'success',
      message: t('logs.startupComplete'),
      details: t('logs.startupDetail')
    });
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'zh' ? 'en' : 'zh');
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };

  return (
    <div className="App">
      <TopBar
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
        currentTheme={theme}
        onToggleTheme={toggleTheme}
        currentLanguage={language}
        onToggleLanguage={toggleLanguage}
        t={t}
      />
      <div className="main-layout">
        <Sidebar
          collapsed={sidebarCollapsed}
          onResetSession={resetSession}
          onClearLogs={clearLogs}
          onMenuClick={handleMenuClick}
          t={t}
        />
        {menuPanelView && (
          <>
            <div className="menu-panel-left" style={{ width: menuPanelWidth }}>
              <MenuPanel
                currentView={menuPanelView}
                settingsSubView={settingsSubView}
                onClose={closeMenuPanel}
                onSaveConfig={handleSaveConfig}
                t={t}
              />
            </div>
            <div
              className="resize-handle-menu"
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startWidth = menuPanelWidth;
                const onMouseMove = (moveEvent: MouseEvent) => {
                  const newWidth = startWidth + (moveEvent.clientX - startX);
                  if (newWidth >= 200 && newWidth <= 600) {
                    setMenuPanelWidth(newWidth);
                  }
                };
                const onMouseUp = () => {
                  document.removeEventListener('mousemove', onMouseMove);
                  document.removeEventListener('mouseup', onMouseUp);
                  document.body.style.cursor = '';
                  document.body.style.userSelect = '';
                };
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
              }}
            >
              <div className="handle-line"></div>
            </div>
          </>
        )}
        <ResizablePanels
          leftPanel={<TerminalPanel logs={executionLogs} onClearLogs={clearLogs} t={t} />}
          rightPanel={<ChatPanel messages={chatMessages} onSendMessage={handleSendMessage} t={t} />}
        />
      </div>
      <BottomBar t={t} />
    </div>
  );
}

export default App;