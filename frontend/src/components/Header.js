import React from 'react';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideIn = keyframes`
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const HeaderContainer = styled.header`
  background-color: #ffffff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 15px 0;
  animation: ${fadeIn} 0.5s ease-out;
`;

const Nav = styled.nav`
  max-width: 1200px;
  margin: 0 auto;
`;

const NavList = styled.ul`
  list-style: none;
  padding: 0;
  display: flex;
  justify-content: center;
  gap: 20px;
`;

const NavItem = styled.li`
  animation: ${slideIn} 0.5s ease-out;
  animation-delay: ${props => props.index * 0.1}s;
`;

const NavButton = styled.button`
  background: none;
  border: none;
  color: #0078D7;
  font-weight: bold;
  font-size: 16px;
  padding: 10px 15px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background-color: #f0f8ff;
    transform: translateY(-2px);
    box-shadow: 0 2px 5px rgba(0, 120, 215, 0.2);
  }

  &:active {
    transform: translateY(0);
    box-shadow: none;
  }
`;

const Icon = styled.span`
  margin-right: 5px;
`;

function Header({ setActiveSection }) {
  const navItems = [
    { icon: '💬', text: 'Chat', section: 'chat' },
    { icon: '📤', text: 'Upload', section: 'upload' },
    { icon: '🕵️', text: 'Research', section: 'research' },
    { icon: '🗑️', text: 'Clear', action: () => localStorage.removeItem('chatHistory') },
  ];

  return (
    <HeaderContainer>
      <Nav>
        <NavList>
          {navItems.map((item, index) => (
            <NavItem key={item.text} index={index}>
              <NavButton
                onClick={() => item.action ? item.action() : setActiveSection(item.section)}
              >
                <Icon>{item.icon}</Icon>
                {item.text}
              </NavButton>
            </NavItem>
          ))}
        </NavList>
      </Nav>
    </HeaderContainer>
  );
}

export default Header;