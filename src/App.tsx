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
import { hippoxCommands } from './api/chat';

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('hippox-theme') as Theme;
    return saved || 'dark';
  });
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('hippox-language') as Language;
    return saved || 'en';
  });
  const { t } = useTranslation(language);
  const [menuPanelView, setMenuPanelView] = useState<MenuPanelView | null>(null);
  const [settingsSubView, setSettingsSubView] = useState<SettingsSubView>('aiModel');
  const [menuPanelWidth, setMenuPanelWidth] = useState<number>(320);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  useEffect(() => {
    checkInitialization();
  }, []);
  useEffect(() => {
    if (isInitialized) {
      loadLogs();
      const interval = setInterval(loadLogs, 1000);
      return () => clearInterval(interval);
    }
  }, [isInitialized]);
  const checkInitialization = async () => {
    try {
      const initialized = await hippoxCommands.isInitialized();
      setIsInitialized(initialized);
      if (!initialized) {
        setChatMessages([{
          id: 'welcome',
          role: 'assistant',
          content: t('welcome.initRequired'),
          timestamp: new Date().toLocaleTimeString()
        }]);
      } else {
        await loadLogs();
        setChatMessages([{
          id: 'welcome',
          role: 'assistant',
          content: t('welcome.message'),
          timestamp: new Date().toLocaleTimeString()
        }]);
      }
    } catch (error) {
    }
  };

  const loadLogs = async () => {
    try {
      const logs = await hippoxCommands.getLogs();
      const formattedLogs: ExecutionLog[] = logs.map(log => ({
        id: log.id,
        timestamp: log.timestamp,
        level: log.level as any,
        message: log.message,
        details: log.details,
        duration: log.duration
      }));
      setExecutionLogs(formattedLogs);
    } catch (error) {
    }
  };

  const appendLog = async (log: Omit<ExecutionLog, 'id' | 'timestamp'>) => {
    await loadLogs();
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

  const handleSaveConfig = async (config: any) => {
    if (config.apiKey && config.provider) {
      setIsInitializing(true);
      try {
        const skillsDir = config.skillsDir || await getDefaultSkillsDir();
        const success = await hippoxCommands.init({
          skills_dir: skillsDir,
          provider: config.provider,
          api_key: config.apiKey,
          workflow_mode: config.workflowMode || 'react'
        });

        if (success) {
          setIsInitialized(true);
          await loadLogs();
          setChatMessages([{
            id: Date.now().toString(),
            role: 'assistant',
            content: t('welcome.initSuccess'),
            timestamp: new Date().toLocaleTimeString()
          }]);
        }
      } catch (error) {
        appendLog({
          level: 'error',
          message: t('logs.initFailed'),
          details: String(error)
        });
      } finally {
        setIsInitializing(false);
      }
    }
  };

  const getDefaultSkillsDir = async (): Promise<string> => {
    return '~/.hippox/skills';
  };

  const handleSendMessage = async (userMessage: string) => {
    if (!isInitialized) {
      const errorMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: t('chat.notInitialized'),
        timestamp: new Date().toLocaleTimeString()
      };
      setChatMessages(prev => [...prev, errorMsg]);
      return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toLocaleTimeString()
    };
    setChatMessages(prev => [...prev, userMsg]);

    try {
      const response = await hippoxCommands.sendMessage(userMessage);
      const assistantMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toLocaleTimeString()
      };
      setChatMessages(prev => [...prev, assistantMsg]);
      await loadLogs();
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `${t('chat.sendFailed')}: ${error}`,
        timestamp: new Date().toLocaleTimeString()
      };
      setChatMessages(prev => [...prev, errorMsg]);
      appendLog({
        level: 'error',
        message: t('logs.sendFailed'),
        details: String(error)
      });
    }
  };

  const clearLogs = async () => {
    try {
      await hippoxCommands.clearLogs();
      await loadLogs();
    } catch (error) {
    }
  };

  const resetSession = async () => {
    try {
      await hippoxCommands.resetSession();
      setChatMessages([{
        id: Date.now().toString(),
        role: 'assistant',
        content: t('session.reset'),
        timestamp: new Date().toLocaleTimeString()
      }]);
      await loadLogs();
    } catch (error) {
      appendLog({
        level: 'error',
        message: t('logs.resetFailed'),
        details: String(error)
      });
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const toggleLanguage = async () => {
    const newLang = language === 'zh' ? 'en' : 'zh';
    setLanguage(newLang);
    // Synchronize the language settings in the backend.
    await hippoxCommands.setLanguage(newLang);
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
        {!sidebarCollapsed && (
          <Sidebar
            collapsed={false}
            onResetSession={resetSession}
            onClearLogs={clearLogs}
            onMenuClick={handleMenuClick}
            t={t}
          />
        )}
        {menuPanelView && (
          <>
            <div className="menu-panel-left" style={{ width: menuPanelWidth }}>
              <MenuPanel
                currentView={menuPanelView}
                settingsSubView={settingsSubView}
                onClose={closeMenuPanel}
                onSaveConfig={handleSaveConfig}
                t={t}
                theme={theme}
                language={language}
                onThemeChange={toggleTheme}
                onLanguageChange={toggleLanguage}
                isInitializing={isInitializing}
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