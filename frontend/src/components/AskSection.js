import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp, faExclamationTriangle, faFileAlt, faQuestionCircle, faTimes } from '@fortawesome/free-solid-svg-icons';
import { formatMessage } from './ChatSection';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideIn = keyframes`
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const AskContainer = styled.div`
  background-color: ${props => props.theme.backgroundColor};
  border-radius: 15px;
  margin-bottom: 30px;
  animation: ${fadeIn} 0.5s ease-out;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
`;


const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
  background-color: ${props => props.theme.cardBackground};
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
`;

const Select = styled.select`
  padding: 15px;
  border: 2px solid ${props => props.theme.inputBorder};
  border-radius: 12px;
  font-size: 16px;
  background-color: ${props => props.theme.inputBackground};
  color: ${props => props.theme.inputText};
  transition: all 0.3s ease;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23${props => props.theme.inputText.slice(1)}%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 15px top 50%;
  background-size: 12px auto;
  padding-right: 30px;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.focusBorderColor};
    box-shadow: 0 0 0 3px ${props => props.theme.focusBoxShadow};
  }
`;

const TextArea = styled.textarea`
  padding: 15px;
  border: 2px solid ${props => props.theme.inputBorder};
  border-radius: 12px;
  font-size: 16px;
  background-color: ${props => props.theme.inputBackground};
  color: ${props => props.theme.inputText};
  transition: all 0.3s ease;
  min-height: 200px;
  resize: vertical;
  line-height: 1.6;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.focusBorderColor};
    box-shadow: 0 0 0 3px ${props => props.theme.focusBoxShadow};
  }
`;

const Button = styled.button`
  background-color: ${props => props.theme.primaryButtonColor};
  color: ${props => props.theme.primaryButtonText};
  border: none;
  padding: 15px 25px;
  border-radius: 25px;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: ${props => props.theme.primaryButtonHover};
    box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
  }

  &:disabled {
    background-color: ${props => props.theme.disabledButtonColor};
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    margin-right: 10px;
  }
`;

const ResultsContainer = styled.div`
  margin-top: 30px;
  padding: 25px;
  background-color: ${props => props.theme.cardBackground};
  border-radius: 12px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
  animation: ${fadeIn} 0.5s ease-out;

  h3 {
    color: ${props => props.theme.titleColor};
    font-size: 24px;
    margin-bottom: 20px;
    font-weight: 600;
  }

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
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 30px auto;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ShowDetailsButton = styled(Button)`
  margin-top: 20px;
  background-color: ${props => props.theme.secondaryButtonColor};
  color: white;

  &:hover {
    background-color: ${props => props.theme.secondaryButtonHover};
  }
`;

const AnswerContainer = styled.div`
  margin-top: 20px;
  border: 2px solid ${props => props.theme.borderColor};
  border-radius: 12px;
  padding: 20px;
  background-color: ${props => props.theme.answerBackground};
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
`;

const Question = styled.h4`
  color: ${props => props.theme.titleColor};
  margin-bottom: 15px;
  font-size: 20px;
  font-weight: 600;
`;

const Answer = styled.div`
  color: ${props => props.theme.messageText};
  font-size: 16px;
  line-height: 1.6;
`;

const CommunityGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 25px;
  margin-top: 25px;
`;

const CommunityCard = styled.div`
  background-color: ${props => props.theme.cardBackground};
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
  border: 2px solid ${props => props.theme.borderColor};
  display: flex;
  flex-direction: column;
  cursor: pointer;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  }
`;

const CommunityTitle = styled.h4`
  color: ${props => props.theme.titleColor};
  margin-bottom: 15px;
  font-size: 20px;
  font-weight: 600;
`;

const CommunityContent = styled.p`
  color: ${props => props.theme.messageText};
  font-size: 16px;
  line-height: 1.5;
  flex-grow: 1;
`;

const CommunityMetaInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
  font-size: 14px;
  color: ${props => props.theme.metaInfoColor};
`;

const CheckboxContainer = styled.label`
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  cursor: pointer;
`;

const CheckboxInput = styled.input`
  appearance: none;
  width: 24px;
  height: 24px;
  border: 2px solid ${props => props.theme.inputBorder};
  border-radius: 6px;
  margin-right: 12px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;

  &:checked {
    background-color: ${props => props.theme.primaryButtonColor};
    border-color: ${props => props.theme.primaryButtonColor};
  }

  &:checked::after {
    content: '✔';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 16px;
  }

  &:hover {
    border-color: ${props => props.theme.primaryButtonColor};
  }
`;

const CheckboxLabel = styled.span`
  color: ${props => props.theme.inputText};
  font-size: 18px;
  font-weight: 500;
`;

const PopupOverlay = styled.div`
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

const PopupContent = styled.div`
  background-color: ${props => props.theme.cardBackground};
  padding: 30px;
  border-radius: 15px;
  max-width: 80%;
  max-height: 80%;
  overflow-y: auto;
  position: relative;
`;

const PopupCloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: ${props => props.theme.titleColor};
`;

const PopupTitle = styled.h3`
  color: ${props => props.theme.titleColor};
  margin-bottom: 20px;
  font-size: 24px;
  font-weight: 600;
`;


const PopupText = styled.div`
  color: ${props => props.theme.messageText};
  font-size: 16px;
  line-height: 1.6;
  white-space: pre-wrap;

  h1, h2, h3, h4, h5, h6 {
    color: ${props => props.theme.titleColor};
    margin-top: 20px;
    margin-bottom: 10px;
  }

  h1 { font-size: 28px; }
  h2 { font-size: 24px; }
  h3 { font-size: 20px; }
  h4 { font-size: 18px; }
  h5 { font-size: 16px; }
  h6 { font-size: 14px; }
`;

const formatMarkdownHeadings = (text) => {
  return text.split('\n').map(line => {
    if (line.startsWith('# ')) {
      return `<h1>${line.substring(2)}</h1>`;
    } else if (line.startsWith('## ')) {
      return `<h2>${line.substring(3)}</h2>`;
    } else if (line.startsWith('### ')) {
      return `<h3>${line.substring(4)}</h3>`;
    } else if (line.startsWith('#### ')) {
      return `<h4>${line.substring(5)}</h4>`;
    } else if (line.startsWith('##### ')) {
      return `<h5>${line.substring(6)}</h5>`;
    } else if (line.startsWith('###### ')) {
      return `<h6>${line.substring(7)}</h6>`;
    }
    return line;
  }).join('\n');
};

function AskSection({ indexName, isRestricted }) {
  const [selectedFile, setSelectedFile] = useState('');
  const [files, setFiles] = useState([]);
  const [questions, setQuestions] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  const [useGraphRag, setUseGraphRag] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState(null);

  useEffect(() => {
    fetchFiles();
  }, [indexName, isRestricted]);

  const fetchFiles = async () => {
    try {
      const response = await fetch(`/indexes/${indexName}/files?is_restricted=${isRestricted}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const filenames = data.files.map(file => file.filename);
      setFiles(filenames || []);
      if (data.files && data.files.length > 0) {
        setSelectedFile(data.files[0].filename);
      }
    } catch (error) {
      console.error('Error loading files:', error);
      setFiles([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile && !useGraphRag) {
      alert('Please select a file before submitting questions or use GraphRAG.');
      return;
    }
    setIsProcessing(true);
    setResults([]);

    try {
      const response = await fetch('/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions: questions.split('\n').filter(q => q.trim()),
          indexName,
          isRestricted,
          fileName: selectedFile,
          useGraphRag,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResults(data.answers);
    } catch (error) {
      console.error('Error during processing:', error);
      setResults([{ question: 'Error', answer: 'An error occurred during processing. Please try again.' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderCommunities = (communities) => {
    if (!communities || communities.length === 0) return null;

    return (
      <CommunityGrid>
        {communities.map((community, index) => (
            <CommunityCard key={index} onClick={() => setSelectedCommunity(community)}>
            <CommunityTitle>{community.title}</CommunityTitle>
            <CommunityContent>{community.content.split('\n\n')[0]}</CommunityContent>
            <CommunityMetaInfo>
              <span>ID: {community.index_id}</span>
              <span>Rank: {community.rank.toFixed(2)}</span>
            </CommunityMetaInfo>
          </CommunityCard>
        ))}
      </CommunityGrid>
    );
  };

  const renderPopup = () => {
    if (!selectedCommunity) return null;
  
    return (
      <PopupOverlay onClick={() => setSelectedCommunity(null)}>
        <PopupContent onClick={(e) => e.stopPropagation()}>
          <PopupCloseButton onClick={() => setSelectedCommunity(null)}>
            <FontAwesomeIcon icon={faTimes} />
          </PopupCloseButton>
          <PopupText dangerouslySetInnerHTML={{ __html: formatMarkdownHeadings(selectedCommunity.content) }} />
        </PopupContent>
      </PopupOverlay>
    );
  };

  const renderResults = () => {
    if (results.length === 0) return null;

    return (
      <ResultsContainer>
        <h3>Answers:</h3>
        {results.map((result, index) => (
          <AnswerContainer key={index}>
            <Question>{result.question}</Question>
            <Answer dangerouslySetInnerHTML={{ __html: formatMessage(result.answer) }} />
            {useGraphRag && renderCommunities(result.context?.reports)}
          </AnswerContainer>
        ))}
        <ShowDetailsButton onClick={() => setShowDetails(!showDetails)}>
          {showDetails ? 'Hide Details' : 'Show Details'}
          <FontAwesomeIcon icon={showDetails ? faChevronUp : faChevronDown} style={{ marginLeft: '10px' }} />
        </ShowDetailsButton>
        {showDetails && (
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ color: props => props.theme.titleColor, marginBottom: '15px' }}>Processing Details:</h4>
            <pre style={{ 
              backgroundColor: props => props.theme.codeBackground, 
              padding: '15px', 
              borderRadius: '8px', 
              overflowX: 'auto',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
      </ResultsContainer>
    );
  };

  return (
    <AskContainer>
      <Form onSubmit={handleSubmit}>
        <CheckboxContainer>
          <CheckboxInput
            type="checkbox"
            checked={useGraphRag}
            onChange={(e) => setUseGraphRag(e.target.checked)}
            id="useGraphRag"
          />
          <CheckboxLabel htmlFor="useGraphRag">
            Use GraphRAG
          </CheckboxLabel>
        </CheckboxContainer>
        {!useGraphRag && (
          <Select
            value={selectedFile}
            onChange={(e) => setSelectedFile(e.target.value)}
            required={!useGraphRag}
          >
            <option value="">Select a file</option>
            {files.map((file, index) => (
              <option key={index} value={file}>
                {file}
              </option>
            ))}
          </Select>
        )}
        <TextArea
          value={questions}
          onChange={(e) => setQuestions(e.target.value)}
          placeholder="Enter your questions, one per line"
          required
        />
        <Button type="submit" disabled={isProcessing || (!selectedFile && !useGraphRag)}>
          <FontAwesomeIcon icon={faFileAlt} />
          Process Questions
        </Button>
      </Form>
      {isProcessing && <LoadingSpinner />}
      {renderResults()}
      {renderPopup()}
    </AskContainer>
  );
}

export default AskSection;