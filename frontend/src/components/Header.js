import React from 'react';
import styled from 'styled-components';

const Nav = styled.nav`
  ul {
    list-style: none;
    padding: 0;
    display: flex;
    justify-content: center;
    gap: 20px;
  }

  button {
    background: none;
    border: none;
    color: #0078D7;
    font-weight: bold;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s ease;

    &:hover {
      background-color: #eaeaea;
    }
  }
`;

function Header({ setActiveSection }) {
  return (
    <Nav>
      <ul>
        <li><button onClick={() => setActiveSection('chat')}>💬 Chat</button></li>
        <li><button onClick={() => setActiveSection('upload')}>📤 Upload</button></li>
        <li><button onClick={() => setActiveSection('research')}>🕵️ Research</button></li>
        <li><button onClick={() => localStorage.removeItem('chatHistory')}>🗑️ Clear</button></li>
      </ul>
    </Nav>
  );
}

export default Header;