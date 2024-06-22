import React, { useState } from 'react';
import styled from 'styled-components';
import Header from './components/Header';
import ChatSection from './components/ChatSection';
import UploadSection from './components/UploadSection';
import ResearchSection from './components/ResearchSection';

const Container = styled.div`
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  height: 90vh;
  display: flex;
  flex-direction: column;
`

const MainContent = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

function App() {
  const [activeSection, setActiveSection] = useState('chat');

  return (
    <Container>
      <Header setActiveSection={setActiveSection} />
      <MainContent>
        {activeSection === 'chat' && <ChatSection />}
        {activeSection === 'upload' && <UploadSection />}
        {activeSection === 'research' && <ResearchSection />}
      </MainContent>
    </Container>
  );
}

export default App;