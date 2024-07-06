import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
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

const WarningMessage = styled.div`
  background-color: ${props => props.theme.warningBackground};
  color: ${props => props.theme.warningText};
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  animation: ${slideIn} 0.3s ease-out;

  svg {
    margin-right: 10px;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const Select = styled.select`
  padding: 12px;
  border: 1px solid ${props => props.theme.inputBorder};
  border-radius: 10px;
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

const TextArea = styled.textarea`
  padding: 12px;
  border: 1px solid ${props => props.theme.inputBorder};
  border-radius: 10px;
  font-size: 16px;
  background-color: ${props => props.theme.inputBackground};
  color: ${props => props.theme.inputText};
  transition: all 0.3s ease;
  min-height: 150px;
  resize: vertical;

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

const ShowDetailsButton = styled(Button)`
  margin-top: 15px;
`;

const AnswerContainer = styled.div`
  margin-top: 15px;
  border: 1px solid ${props => props.theme.borderColor};
  border-radius: 10px;
  padding: 10px;
`;

const Question = styled.h4`
  color: ${props => props.theme.titleColor};
  margin-bottom: 10px;
`;

const Answer = styled.div`
  color: ${props => props.theme.messageText};
`;

function AskSection({ indexName, isRestricted }) {
  const [selectedFile, setSelectedFile] = useState('');
  const [files, setFiles] = useState([]);
  const [questions, setQuestions] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [showDetails, setShowDetails] = useState(false);

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
        setSelectedFile(data.files[0]);
      }
    } catch (error) {
      console.error('Error loading files:', error);
      setFiles([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please select a file before submitting questions.');
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

  const renderResults = () => {
    if (results.length === 0) return null;

    return (
      <ResultsContainer>
        <h3>Answers:</h3>
        {results.map((result, index) => (
          <AnswerContainer key={index}>
            <Question>{result.question}</Question>
            <Answer dangerouslySetInnerHTML={{ __html: formatMessage(result.answer) }} />
          </AnswerContainer>
        ))}
        <ShowDetailsButton onClick={() => setShowDetails(!showDetails)}>
          {showDetails ? 'Hide Details' : 'Show Details'}
          <FontAwesomeIcon icon={showDetails ? faChevronUp : faChevronDown} style={{ marginLeft: '5px' }} />
        </ShowDetailsButton>
        {showDetails && (
          <div>
            <h4>Processing Details:</h4>
            <pre>{JSON.stringify(results, null, 2)}</pre>
          </div>
        )}
      </ResultsContainer>
    );
  };

  return (
    <AskContainer>
      <Title>Ask Questions</Title>
      <WarningMessage>
        <FontAwesomeIcon icon={faExclamationTriangle} />
        Warning: This feature may lead to significant token usage as the complete document will be processed.
      </WarningMessage>
      <Form onSubmit={handleSubmit}>
        <Select
          value={selectedFile}
          onChange={(e) => setSelectedFile(e.target.value)}
          required
        >
          <option value="">Select a file</option>
          {files.map((file, index) => (
            <option key={index} value={file}>
              {file}
            </option>
          ))}
        </Select>
        <TextArea
          value={questions}
          onChange={(e) => setQuestions(e.target.value)}
          placeholder="Enter your questions, one per line"
          required
        />
        <Button type="submit" disabled={isProcessing || !selectedFile}>
          Process Questions
        </Button>
      </Form>
      {isProcessing && <LoadingSpinner />}
      {renderResults()}
    </AskContainer>
  );
}

export default AskSection;