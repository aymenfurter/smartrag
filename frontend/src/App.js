import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Header from './components/Header';
import ChatSection from './components/ChatSection';
import UploadSection from './components/UploadSection';
import ResearchSection from './components/ResearchSection';
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

const LoadingIndicator = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: 18px;
  color: #666;
`;

function App() {
  const [activeSection, setActiveSection] = useState('chat');
  const [indexes, setIndexes] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [researchQuestion, setResearchQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedBefore, setHasLoadedBefore] = useState(false);

  useEffect(() => {
    fetchIndexes();
  }, []);

  useEffect(() => {
    if (indexes.length > 0 && !selectedIndex) {
      const lastUsedIndex = localStorage.getItem('lastUsedIndex');
      if (lastUsedIndex) {
        const parsedIndex = JSON.parse(lastUsedIndex);
        const foundIndex = indexes.find(index => index[0] === parsedIndex[0] && index[1] === parsedIndex[1]);
        if (foundIndex) {
          setSelectedIndex(foundIndex);
        } else {
          setSelectedIndex(indexes[0]);
        }
      } else {
        setSelectedIndex(indexes[0]);
      }
    }
  }, [indexes, selectedIndex]);

  const fetchIndexes = async () => {
    try {
      const response = await fetch('/indexes');
      const data = await response.json();
      setIndexes(data.indexes);
      setHasLoadedBefore(true);
    } catch (error) {
      console.error('Error loading indexes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectIndex = (index) => {
    setSelectedIndex(index);
    localStorage.setItem('lastUsedIndex', JSON.stringify(index));
  };

  const handleStartResearch = (question, indexName, isRestricted) => {
    setResearchQuestion(question);
    setSelectedIndex([indexName, isRestricted]);
    setActiveSection('research');
  };

  const handleDeleteIndex = (indexName, isRestricted) => {
    setIndexes(prevIndexes => prevIndexes.filter(index => !(index[0] === indexName && index[1] === isRestricted)));
    if (selectedIndex && selectedIndex[0] === indexName && selectedIndex[1] === isRestricted) {
      setSelectedIndex(null);
      localStorage.removeItem('lastUsedIndex');
    }
  };

  return (
    <Container>
      <Header setActiveSection={setActiveSection} />
      <MainContent>
        <Sidebar>
          {isLoading && !hasLoadedBefore ? (
            <LoadingIndicator>Loading indexes...</LoadingIndicator>
          ) : (
            <IndexRibbon 
              indexes={indexes} 
              selectedIndex={selectedIndex} 
              onSelectIndex={handleSelectIndex}
              onIndexesChange={fetchIndexes}
              onDeleteIndex={handleDeleteIndex}
            />
          )}
        </Sidebar>
        <ContentArea>
          {selectedIndex ? (
            <>
              {activeSection === 'chat' && (
                <ChatSection 
                  indexName={selectedIndex[0]} 
                  isRestricted={selectedIndex[1]} 
                  onStartResearch={handleStartResearch}
                />
              )}
              {activeSection === 'upload' && (
                <UploadSection 
                  indexName={selectedIndex[0]} 
                  isRestricted={selectedIndex[1]}
                  onFilesChange={fetchIndexes}
                />
              )}
              {activeSection === 'research' && (
                <ResearchSection 
                  indexes={indexes}
                  initialQuestion={researchQuestion}
                  initialIndex={selectedIndex}
                />
              )}
            </>
          ) : (
            <LoadingIndicator>Select an index to begin</LoadingIndicator>
          )}
        </ContentArea>
      </MainContent>
    </Container>
  );
}

export default App;