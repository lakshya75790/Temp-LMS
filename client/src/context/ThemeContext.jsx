import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('it360_lms_theme');
    return saved ? saved : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    localStorage.setItem('it360_lms_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Global Ctrl + M keyboard shortcut to toggle Light Mode / Dark Mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for Ctrl + M (or Cmd + M on macOS), ignoring Alt key combinations
      if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'm' || e.key === 'M' || e.code === 'KeyM')) {
        const target = e.target;
        if (target) {
          const tagName = target.tagName ? target.tagName.toUpperCase() : '';
          const isTextInput =
            (tagName === 'INPUT' && !['CHECKBOX', 'RADIO', 'BUTTON', 'SUBMIT', 'RESET', 'FILE', 'RANGE', 'COLOR', 'IMAGE'].includes(target.type?.toUpperCase())) ||
            tagName === 'TEXTAREA' ||
            Boolean(target.isContentEditable) ||
            target.getAttribute?.('contenteditable') === 'true' ||
            Boolean(target.closest?.('[contenteditable="true"]'));

          // Do not trigger toggle when the user is typing inside text-editing controls
          if (isTextInput) {
            return;
          }
        }

        e.preventDefault();
        toggleTheme();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

