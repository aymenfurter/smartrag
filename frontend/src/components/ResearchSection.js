import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faMinus, faCog, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { formatMessage } from './ChatSection';

const ResearchContainer = styled.div`
  padding: 2rem;
  background-color: #ffffff;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
`;

const Title = styled.h2`
  color: #333;
  font-size: 2rem;
  margin-bottom: 1rem;
`;

const Subtitle = styled.p`
  color: #666;
  margin-bottom: 2rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;

  &:focus {
    outline: none;
    border-color: #0078D7;
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  background-color: white;
  transition: border-color 0.3s ease;

  &:focus {
    outline: none;
    border-color: #0078D7;
  }
`;

const Button = styled.button`
  background-color: #0078D7;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: #005a9e;
  }

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const DataSourceContainer = styled.div`
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
`;

const DataSourceHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const DataSourceContent = styled.div`
  display: ${props => props.isExpanded ? 'block' : 'none'};
`;

const IconButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: #0078D7;
`;

const ResultsContainer = styled.div`
  margin-top: 2rem;
  padding: 1.5rem;
  background-color: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
`;

const LoadingSpinner = styled.div`
  border: 4px solid #f3f3f3;
  border-top: 4px solid #0078D7;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
  margin: 2rem auto;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const SliderContainer = styled.div`
  margin-bottom: 1rem;
`;

const Slider = styled.input`
  width: 100%;
  margin-top: 0.5rem;
`;

const SliderLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
`;

const ConversationContainer = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background-color: #f0f0f0;
  border-radius: 8px;
  max-height: 300px;
  overflow-y: auto;
`;

const Message = styled.div`
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  border-radius: 4px;
  background-color: ${props => props.role === 'assistant' ? '#e1f5fe' : '#fff8e1'};
`;

const ShowDetailsButton = styled(Button)`
  margin-top: 1rem;
`;

const PDFPreviewContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const PDFPreview = styled.div`
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 80%;
  height: 80%;
  display: flex;
  flex-direction: column;
`;

const PDFEmbed = styled.embed`
  width: 100%;
  height: 100%;
  border: none;
`;

const CloseButton = styled.button`
  align-self: flex-end;
  background-color: #0078D7;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 10px;
`;



function ResearchSection({ indexes, initialQuestion = '', initialIndex = null }) {
  const [question, setQuestion] = useState(initialQuestion);
  const [dataSources, setDataSources] = useState([
    initialIndex
      ? { index: initialIndex[0], name: '', description: '', isExpanded: false, isRestricted: initialIndex[1] }
      : { index: '', name: '', description: '', isExpanded: false, isRestricted: true }
  ]);
  const [isResearching, setIsResearching] = useState(false);
  const [results, setResults] = useState('');
  const [maxRounds, setMaxRounds] = useState(20);
  const [showDetails, setShowDetails] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [pdfPreview, setPDFPreview] = useState(null);

  useEffect(() => {
    if (initialQuestion) {
      setQuestion(initialQuestion);
    }
    if (initialIndex) {
      setDataSources([{ index: initialIndex[0], name: '', description: '', isExpanded: false, isRestricted: initialIndex[1] }]);
    }
  }, [initialQuestion, initialIndex]);

  const handleAddDataSource = () => {
    setDataSources([...dataSources, { index: '', name: '', description: '', isExpanded: false, isRestricted: true }]);
  };

  const handleRemoveDataSource = (index) => {
    const newDataSources = dataSources.filter((_, i) => i !== index);
    setDataSources(newDataSources);
  };

  const handleDataSourceChange = (index, field, value) => {
    const newDataSources = [...dataSources];
    newDataSources[index][field] = value;
    setDataSources(newDataSources);
  };

  const toggleDataSourceExpansion = (index) => {
    const newDataSources = [...dataSources];
    newDataSources[index].isExpanded = !newDataSources[index].isExpanded;
    setDataSources(newDataSources);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsResearching(true);
    setResults('');
    setConversation([]);

    try {
      const response = await fetch('/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          dataSources,
          maxRounds,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const messages = chunk.split('\n').filter(Boolean).map(JSON.parse);
        messages.forEach(message => {
          if (message.final_conclusion) {
            setResults(message.final_conclusion);
          } else {
            setConversation(prev => [...prev, message]);
          }
        });
      }
    } catch (error) {
      console.error('Error during research:', error);
      setResults('An error occurred during research. Please try again.');
    } finally {
      setIsResearching(false);
    }
  };

  const handleCitationClick = useCallback((citation, dataSource) => {
    const pdfUrl = `http://localhost:5000/pdf/${dataSource.index}/${encodeURIComponent(citation)}?is_restricted=${dataSource.isRestricted}`;
    setPDFPreview(pdfUrl);
  }, []);

  const renderResults = () => {
    if (!results) return null;

    const formattedResults = formatMessage(results);
    const resultsWithClickableLinks = formattedResults.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (match, text, url) => {
        const citation = url.split('/').pop();
        return `<a href="#" data-citation="${citation}">${text}</a>`;
      }
    );

    return (
      <ResultsContainer>
        <h3>Research Conclusion:</h3>
        <div 
          dangerouslySetInnerHTML={{ __html: resultsWithClickableLinks }}
          onClick={(e) => {
            if (e.target.tagName === 'A') {
              e.preventDefault();
              let citation = e.target.getAttribute('href');
              const parts = citation.split('/');
              const filename = parts.pop().replace('.md', '.pdf');
        
              handleCitationClick(filename, dataSources[0]);
            }
          
          }}
        />
        <ShowDetailsButton onClick={() => setShowDetails(!showDetails)}>
          {showDetails ? 'Hide Details' : 'Show Details'}
          <FontAwesomeIcon icon={showDetails ? faChevronUp : faChevronDown} style={{ marginLeft: '5px' }} />
        </ShowDetailsButton>
        {showDetails && (
          <ConversationContainer>
            {conversation.map((message, index) => (
              <Message key={index} role={message.role}>
                <strong>{message.name || message.role}:</strong>
                <div dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }} />
                {message.tool_calls && (
                  <div>
                    <strong>Tool Calls:</strong>
                    <pre>{JSON.stringify(message.tool_calls, null, 2)}</pre>
                  </div>
                )}
                {message.tool_responses && (
                  <div>
                    <strong>Tool Responses:</strong>
                    <pre>{JSON.stringify(message.tool_responses, null, 2)}</pre>
                  </div>
                )}
              </Message>
            ))}
          </ConversationContainer>
        )}
      </ResultsContainer>
    );
  };

  return (
    <ResearchContainer>
      <Title>Research Hub</Title>
      <Subtitle>Explore topics with AI-powered research assistants</Subtitle>
      <Form onSubmit={handleSubmit}>
        <Input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What would you like to research?"
          required
        />
        {dataSources.map((source, index) => (
          <DataSourceContainer key={index}>
            <DataSourceHeader>
              <Select
                value={source.index}
                onChange={(e) => handleDataSourceChange(index, 'index', e.target.value)}
                required
              >
                <option value="">Select a data source</option>
                {indexes.map((idx) => (
                  <option key={idx[0]} value={idx[0]}>
                    {idx[0]} ({idx[1] ? 'Restricted' : 'Open'})
                  </option>
                ))}
              </Select>
              <div>
                <IconButton onClick={() => toggleDataSourceExpansion(index)}>
                  <FontAwesomeIcon icon={faCog} />
                </IconButton>
                <IconButton onClick={() => handleRemoveDataSource(index)}>
                  <FontAwesomeIcon icon={faMinus} />
                </IconButton>
              </div>
            </DataSourceHeader>
            <DataSourceContent isExpanded={source.isExpanded}>
              <Input
                type="text"
                value={source.name}
                onChange={(e) => handleDataSourceChange(index, 'name', e.target.value)}
                placeholder="Custom name for this data source"
              />
              <Input
                type="text"
                value={source.description}
                onChange={(e) => handleDataSourceChange(index, 'description', e.target.value)}
                placeholder="Brief description of this data source"
              />
            </DataSourceContent>
          </DataSourceContainer>
        ))}
        <Button type="button" onClick={handleAddDataSource}>
          <FontAwesomeIcon icon={faPlus} /> Add Data Source
        </Button>
        <SliderContainer>
          <SliderLabel>How fast do you need your results?</SliderLabel>
          <Slider
            type="range"
            min="25"
            max="100"
            value={maxRounds}
            onChange={(e) => setMaxRounds(parseInt(e.target.value))}
          />
          <span>Estimated time: {maxRounds} seconds</span>
        </SliderContainer>
        <Button type="submit" disabled={isResearching}>
          Start Research
        </Button>
      </Form>
      {isResearching && <LoadingSpinner />}
      {renderResults()}
      {pdfPreview && (
        <PDFPreviewContainer>
          <PDFPreview>
            <CloseButton onClick={() => setPDFPreview(null)}>Close</CloseButton>
            <PDFEmbed src={pdfPreview} type="application/pdf" />
          </PDFPreview>
        </PDFPreviewContainer>
      )}
    </ResearchContainer>
  );
}

export default ResearchSection;