import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { createGlobalStyle, ThemeProvider } from 'styled-components';
import { useState, useEffect } from 'react';
const GlobalStyle = createGlobalStyle`
   body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: ${props => props.theme.backgroundColor};
    color: ${props => props.theme.textColor};
    transition: all 0.3s ease;
  }
  * {
    box-sizing: border-box;
  }

  a {
    color: ${props => props.theme.linkColor};
    text-decoration: none;
    transition: color 0.3s ease;

    &:hover {
      color: ${props => props.theme.linkHoverColor};
    }
  }

`;


const baseTheme = {
  primaryColor: '#0078D7',
  secondaryColor: '#f0f0f0',
  textColor: '#333333',
  backgroundColor: '#ffffff',
  borderColor: '#e0e0e0',
};

const lightTheme = {
  ...baseTheme,
  type: 'light',
  invertedTextColor: '#ffffff',
  buttonHoverBackground: '#f0f8ff',
  scrollbarTrack: '#f1f1f1',
  scrollbarThumb: '#888888',
  scrollbarThumbHover: '#555555',
  modalOverlay: 'rgba(0, 0, 0, 0.5)',
  primaryColor: '#0078D7',
  secondaryColor: '#00A6ED',
  accentColor: '#33C3F0',
};

const darkTheme = {
  ...baseTheme,
  type: 'dark',
  primaryColor: '#4da6ff',
  secondaryColor: '#333333',
  textColor: '#ffffff',
  backgroundColor: '#1a1a1a',
  borderColor: '#444444',
  invertedTextColor: '#333333',
  buttonHoverBackground: '#333333',
  scrollbarTrack: '#2a2a2a',
  scrollbarThumb: '#666666',
  scrollbarThumbHover: '#888888',
  modalOverlay: 'rgba(0, 0, 0, 0.7)',
  accentColor: '#33C3F0',
};

const getThemeValues = (theme) => ({
  ...theme,
  headerBackground: theme.backgroundColor,
  buttonColor: theme.primaryColor,
  buttonTextColor: '#ffffff',
  formBackground: theme.backgroundColor,
  inputBackground: theme.type === 'light' ? theme.backgroundColor : theme.secondaryColor,
  inputBorder: theme.borderColor,
  inputText: theme.textColor, 
  focusBorderColor: theme.primaryColor,
  focusBoxShadow: `${theme.primaryColor}33`,
  userMessageBackground: theme.primaryColor,
  userMessageText: '#ffffff', 
  assistantMessageBackground: theme.type === 'light' ? theme.backgroundColor : theme.secondaryColor,
  assistantMessageText: theme.textColor,
  codeBackground: theme.secondaryColor,
  codeText: theme.textColor,
  preBackground: theme.secondaryColor,
  preText: theme.textColor,
  citationText: theme.type === 'light' ? '#666666' : '#aaaaaa',
  primaryButtonColor: theme.primaryColor,
  primaryButtonText: '#ffffff', 
  primaryButtonHover: theme.type === 'light' ? '#005a9e' : '#3a8cd6',
  secondaryButtonColor: theme.secondaryColor,
  secondaryButtonText: theme.type === 'light' ? theme.textColor : '#ffffff', 
  secondaryButtonHover: theme.type === 'light' ? '#e0e0e0' : '#444444',
  disabledButtonColor: theme.type === 'light' ? '#cccccc' : '#555555',
  disabledButtonText: '#ffffff', 
  linkColor: theme.primaryColor,
  modalBackground: theme.backgroundColor,
  closeButtonBackground: theme.primaryColor,
  closeButtonText: '#ffffff',
  closeButtonHover: theme.type === 'light' ? '#005a9e' : '#3a8cd6',
  sidebarBackground: theme.type === 'light' ? '#f8f9fa' : '#2a2a2a',
  itemBackground: theme.backgroundColor,
  selectedItemBackground: theme.primaryColor,
  itemText: theme.textColor,
  selectedItemText: '#ffffff', 
  deleteButtonColor: theme.type === 'light' ? '#666666' : '#aaaaaa',
  deleteButtonHoverColor: '#ff4d4d',
  checkboxBorder: theme.primaryColor,
  checkboxBackground: theme.backgroundColor,
  checkboxCheckedBackground: theme.primaryColor,
  checkboxCheckedColor: '#ffffff', 
  checkboxHoverShadow: `${theme.primaryColor}80`,
  labelText: theme.textColor,
  titleColor: theme.textColor,
  subtitleColor: theme.type === 'light' ? '#666666' : '#aaaaaa',
  cardBackground: theme.type === 'light' ? theme.backgroundColor : theme.secondaryColor,
  iconColor: theme.primaryColor,
  iconHoverColor: theme.type === 'light' ? '#005a9e' : '#3a8cd6',
  spinnerColor: theme.type === 'light' ? '#f3f3f3' : '#333333',
  spinnerTopColor: theme.primaryColor,
  messageText: theme.textColor,
  selectBackground: theme.type === 'light' ? theme.backgroundColor : theme.secondaryColor,
  selectText: theme.textColor, 
  selectBorder: theme.borderColor,
  conclusionBackground: theme.type === 'light' ? '#f0f8ff' : '#2a2a2a',
  eventLogBackground: theme.type === 'light' ? '#f9f9f9' : '#2a2a2a',
  eventItemBackground: theme.type === 'light' ? '#ffffff' : '#333333',
  eventItemBorder: theme.primaryColor,
  highlightBackground: theme.type === 'light' ? '#fff3cd' : '#4d4d00',
  tableRowHover: theme.type === 'light' ? '#f5f5f5' : '#333333',
  linkHoverColor: theme.type === 'light' ? '#0056b3' : '#66b3ff',
  linkUnderlineColor: theme.primaryColor,
  paginationLinkColor: theme.primaryColor,
  paginationBackground: theme.backgroundColor,
  paginationActiveBackground: theme.primaryColor,
  paginationHoverBackground: theme.type === 'light' ? '#e9ecef' : '#333333',
});

function ThemedApp() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('isDarkMode');
    return saved !== null ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('isDarkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const theme = getThemeValues(isDarkMode ? darkTheme : lightTheme);

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <App toggleTheme={toggleTheme} isDarkMode={isDarkMode} />
    </ThemeProvider>
  );
}

ReactDOM.render(
  <React.StrictMode>
    <ThemedApp />
  </React.StrictMode>,
  document.getElementById('root')
);