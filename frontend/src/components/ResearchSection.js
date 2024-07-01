import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faMinus, faCog, faChevronDown, faChevronUp, faSearch } from '@fortawesome/free-solid-svg-icons';
import { formatMessage } from './ChatSection';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideIn = keyframes`
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const ResearchContainer = styled.div`
  padding: 20px;
  background-color: ${props => props.theme.backgroundColor};
  border-radius: 10px;
  margin-bottom: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  animation: ${fadeIn} 0.5s ease-out;
`;

const Title = styled.h2`
  color: ${props => props.theme.titleColor};
  font-size: 24px;
  margin-bottom: 10px;
`;

const Subtitle = styled.p`
  color: ${props => props.theme.subtitleColor};
  margin-bottom: 20px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const Input = styled.input`
  padding: 12px;
  border: 1px solid ${props => props.theme.inputBorder};
  border-radius: 20px;
  font-size: 16px;
  background-color: ${props => props.theme.inputBackground};
  color: ${props => props.theme.inputText};
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.focusBorderColor};
    box-shadow: 0 0 0 2px ${props => props.theme.focusBoxShadow};
  }
`;

const Select = styled.select`
  padding: 12px;
  border: 1px solid ${props => props.theme.inputBorder};
  border-radius: 20px;
  font-size: 16px;
  background-color: ${props => props.theme.inputBackground};
  color: ${props => props.theme.inputText};
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.focusBorderColor};
    box-shadow: 0 0 0 2px ${props => props.theme.focusBoxShadow};
  }
`;

const Button = styled.button`
  background-color: ${props => props.theme.primaryButtonColor};
  color: ${props => props.theme.primaryButtonText};
  border: none;
  padding: 12px 20px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.3s ease;

  &:hover {
    background-color: ${props => props.theme.primaryButtonHover};
    transform: translateY(-2px);
  }

  &:disabled {
    background-color: ${props => props.theme.disabledButtonColor};
    cursor: not-allowed;
    transform: none;
  }

  &:active {
    transform: translateY(0);
  }
`;

const DataSourceContainer = styled.div`
  background-color: ${props => props.theme.cardBackground};
  padding: 15px;
  border-radius: 10px;
  margin-bottom: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  animation: ${slideIn} 0.3s ease-out;
`;

const DataSourceHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const DataSourceContent = styled.div`
  display: ${props => props.isExpanded ? 'block' : 'none'};
`;

const IconButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: ${props => props.theme.iconColor};
  transition: color 0.3s ease;

  &:hover {
    color: ${props => props.theme.iconHoverColor};
  }
`;

const ResultsContainer = styled.div`
  margin-top: 20px;
  padding: 20px;
  background-color: ${props => props.theme.cardBackground};
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

  a {
    color: ${props => props.theme.primaryButtonColor};
    text-decoration: underline;
    cursor: pointer;

    &:hover {
      color: ${props => props.theme.primaryButtonHover};
    }
  }
`;

const LoadingSpinner = styled.div`
  border: 4px solid ${props => props.theme.spinnerColor};
  border-top: 4px solid ${props => props.theme.spinnerTopColor};
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
  margin: 20px auto;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const SliderContainer = styled.div`
  margin-bottom: 15px;
`;

const Slider = styled.input`
  width: 100%;
  margin-top: 10px;
`;

const SliderLabel = styled.label`
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: ${props => props.theme.labelText};
`;

const ConversationContainer = styled.div`
  margin-top: 15px;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid ${props => props.theme.borderColor};
  border-radius: 10px;
  padding: 10px;
`;

const Message = styled.div`
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 10px;
  background-color: ${props => props.role === 'assistant' ? props.theme.focusBorderColor : props.theme.inputBackground};
  color: ${props => props.role === 'assistant' ? props.theme.disabledButtonText : props.theme.messageText};
`;

const ShowDetailsButton = styled(Button)`
  margin-top: 15px;
`;

const PDFPreviewContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${props => props.theme.modalOverlay};
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: ${fadeIn} 0.3s ease-out;
`;

const PDFPreview = styled.div`
  background-color: ${props => props.theme.modalBackground};
  padding: 20px;
  border-radius: 10px;
  width: 80%;
  height: 80%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  animation: ${slideIn} 0.3s ease-out;
`;

const PDFEmbed = styled.embed`
  width: 100%;
  height: 100%;
  border: none;
`;

const CloseButton = styled(Button)`
  align-self: flex-end;
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
    
    if (field === 'index') {
      const selectedIndex = indexes.find(idx => idx[0] === value);
      if (selectedIndex) {
        newDataSources[index].isRestricted = selectedIndex[1];
      }
    }
    
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
    let prefix = "/";
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      prefix  = "http://localhost:5000/";
    }

    const pdfUrl = `${prefix}pdf/${dataSource}/${encodeURIComponent(citation)}?is_restricted=${dataSource.isRestricted}`;
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
              let parts = citation.split('/');
              let ingestionPart = parts[parts.length - 2];
              let baseString = ingestionPart.replace(/-ingestion$/, '');
              let result = baseString.substring(baseString.lastIndexOf('-') + 1);
              const filename = parts.pop().replace('.md', '.pdf');
        
              handleCitationClick(filename, result);
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