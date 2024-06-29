import React from 'react';
import styled, { keyframes } from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments, faUpload, faMagnifyingGlass, faTrash, faSun, faMoon } from '@fortawesome/free-solid-svg-icons';
import logo from './logo.png'; // Make sure the path is correct

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideIn = keyframes`
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const gradientAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const HeaderContainer = styled.header`
  background-color: ${props => props.theme.headerBackground};
  padding: 15px 0;
  animation: ${fadeIn} 0.5s ease-out;
`;

const Nav = styled.nav`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
`;

const Logo = styled.img`
  width: 60px;
  height: 60px;
`;

const AppName = styled.div`
  font-family: 'Poppins', sans-serif;
  font-size: 42px;
  font-weight: 700;
  letter-spacing: -3px;
  display: flex;
  align-items: center;
  text-transform: none;
  line-height: 100px;
  white-space: nowrap;
`;

const SmartText = styled.span`
  color: ${props => props.theme.type === 'dark' ? 'white' : 'black'};
  margin-right: 5px;
`;

const RagText = styled.span`
  color: transparent;
  -webkit-text-stroke: 1px;
  -webkit-text-stroke-color: ${props => `linear-gradient(45deg, ${props.theme.primaryColor}, ${props.theme.accentColor})`};
  background: ${props => `linear-gradient(45deg, ${props.theme.primaryColor}, ${props.theme.accentColor})`};
  background-size: 300% 300%;
  -webkit-background-clip: text;
  animation: ${gradientAnimation} 5s ease infinite;
`;

const NavList = styled.ul`
  list-style: none;
  padding: 0;
  display: flex;
  gap: 10px;
`;

const NavItem = styled.li`
  animation: ${slideIn} 0.5s ease-out;
  animation-delay: ${props => props.index * 0.1}s;
`;

const NavButton = styled.button`
  background: ${props => props.active ? props.theme.primaryColor : 'none'};
  border: none;
  color: ${props => props.active ? props.theme.buttonTextColor : props.theme.buttonColor};
  font-weight: bold;
  font-size: 14px;
  padding: 10px 15px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 5px;

  &:hover {
    background-color: ${props => props.theme.buttonHoverBackground};
    transform: translateY(-2px);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: translateY(0);
    box-shadow: none;
  }
`;

const ThemeToggle = styled(NavButton)`
  background: ${props => props.theme.type === 'dark' ? props.theme.accentColor : props.theme.primaryColor};
  color: ${props => props.theme.buttonTextColor};
`;

function Header({ activeSection, setActiveSection, toggleTheme, isDarkMode }) {
  const navItems = [
    { icon: faComments, text: 'Chat', section: 'chat' },
    { icon: faUpload, text: 'Upload', section: 'upload' },
    { icon: faMagnifyingGlass, text: 'Research', section: 'research' },
    { icon: faTrash, text: 'Clear', action: () => localStorage.removeItem('chatHistory') },
  ];

  return (
    <HeaderContainer>
      <Nav>
        <LogoContainer>
          <Logo src={logo} alt="SmartRAG Logo" />
          <AppName>
            <SmartText>smart</SmartText>
            <RagText>RAG</RagText>
          </AppName>
        </LogoContainer>
        <NavList>
          {navItems.map((item, index) => (
            <NavItem key={item.text} index={index}>
              <NavButton
                active={activeSection === item.section}
                onClick={() => item.action ? item.action() : setActiveSection(item.section)}
              >
                <FontAwesomeIcon icon={item.icon} />
                {item.text}
              </NavButton>
            </NavItem>
          ))}
          <NavItem index={navItems.length}>
            <ThemeToggle onClick={toggleTheme}>
              <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} />
              {isDarkMode ? 'Light' : 'Dark'}
            </ThemeToggle>
          </NavItem>
        </NavList>
      </Nav>
    </HeaderContainer>
  );
}

export default Header;