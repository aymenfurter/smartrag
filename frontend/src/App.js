import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Header from './components/Header';
import ChatSection from './components/ChatSection';
import UploadSection from './components/UploadSection';
import IndexRibbon from './components/IndexRibbon';

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
`;

const MainContent = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

const Sidebar = styled.div`
  width: 200px;
  background-color: #f0f0f0;
  overflow-y: auto;
  padding: 10px;
  border-right: 1px solid #ddd;
`;

const ContentArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding-left: 20px;
`;

function App() {
  const [activeSection, setActiveSection] = useState('chat');
  const [indexes, setIndexes] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);

  useEffect(() => {
    fetchIndexes();
  }, []);

  const fetchIndexes = async () => {
    try {
      const response = await fetch('/indexes');
      const data = await response.json();
      setIndexes(data.indexes);
    } catch (error) {
      console.error('Error loading indexes:', error);
    }
  };

  const handleSelectIndex = (index) => {
    setSelectedIndex(index);
  };

  return (
    <Container>
      <Header setActiveSection={setActiveSection} />
      <MainContent>
        <Sidebar>
          <IndexRibbon 
            indexes={indexes} 
            selectedIndex={selectedIndex} 
            onSelectIndex={handleSelectIndex}
            onIndexesChange={fetchIndexes}
          />
        </Sidebar>
        <ContentArea>
          {activeSection === 'chat' && selectedIndex && (
            <ChatSection 
              indexName={selectedIndex[0]} 
              isRestricted={selectedIndex[1]} 
            />
          )}
          {activeSection === 'upload' && selectedIndex && (
            <UploadSection 
              indexName={selectedIndex[0]} 
              isRestricted={selectedIndex[1]}
              onFilesChange={fetchIndexes}
            />
          )}
        </ContentArea>
      </MainContent>
    </Container>
  );
}

export default App;