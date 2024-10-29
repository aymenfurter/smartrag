import React, { useState, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileExport,
  faCheckCircle,
  faTimesCircle,
  faQuestionCircle,
  faExclamationTriangle,
  faSpinner,
  faTimes,
  faBook,
  faQuoteRight,
  faFileAlt
} from '@fortawesome/free-solid-svg-icons';

const ResultsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  background: ${props => props.theme.cardBackground};
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
  width: 100%;
`;

const ComparisonTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  overflow: hidden;

  th, td {
    border: 1px solid ${props => props.theme.borderColor};
    padding: 1.25rem;
    text-align: left;
  }

  th {
    background: ${props => props.theme.tableHeaderBackground};
    font-weight: 600;
    font-size: 1.1rem;
  }

  tr:nth-child(even) {
    background: ${props => props.theme.tableRowEvenBackground};
  }

  tr:hover {
    background: ${props => props.theme.tableRowHoverBackground};
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
`;

const ResponseValue = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 500;
  
  ${props => props.type === 'yes' && `color: ${props.theme.successColor};`}
  ${props => props.type === 'no' && `color: ${props.theme.errorColor};`}
  ${props => props.type === 'partial' && `color: ${props.theme.warningColor};`}
`;

const ExportButton = styled.button`
  padding: 1rem 2rem;
  background: ${props => props.theme.primaryButtonColor};
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  align-self: flex-end;
  transition: all 0.2s ease;
  font-weight: 500;
  font-size: 1rem;

  &:hover {
    background: ${props => props.theme.primaryButtonHover};
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
`;

const ErrorMessage = styled.div`
  color: ${props => props.theme.errorColor};
  background-color: ${props => props.theme.errorBackground};
  padding: 1.25rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 500;
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.75);
  display: ${props => props.isVisible ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

const SideBySideModal = styled.div`
  background: ${props => props.theme.cardBackground};
  width: 95%;
  height: 95vh;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
`;

const ModalHeader = styled.div`
  padding: 1.5rem 2rem;
  border-bottom: 1px solid ${props => props.theme.borderColor};
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${props => props.theme.tableHeaderBackground};
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  color: ${props => props.theme.titleColor};
  font-weight: 600;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: ${props => props.theme.textColor};
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border-radius: 50%;

  &:hover {
    color: ${props => props.theme.primaryButtonColor};
    background: rgba(0, 0, 0, 0.05);
  }
`;

const SideBySideContainer = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

const SourceColumn = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid ${props => props.theme.borderColor};
  
  &:last-child {
    border-right: none;
  }
`;

const TabContainer = styled.div`
  display: flex;
  background: ${props => props.theme.tableHeaderBackground};
  border-bottom: 1px solid ${props => props.theme.borderColor};
  padding: 0 1rem;
`;

const Tab = styled.button`
  padding: 1rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 2px solid ${props => props.active ? props.theme.primaryButtonColor : 'transparent'};
  color: ${props => props.active ? props.theme.primaryButtonColor : props.theme.textColor};
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;

  &:hover {
    color: ${props => props.theme.primaryButtonColor};
  }
`;

const ContentContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
`;

const FormattedContent = styled.div`
  color: ${props => props.theme.textColor};
  font-size: 1rem;
  line-height: 1.6;

  h1, h2, h3, h4, h5, h6 {
    color: ${props => props.theme.titleColor};
    margin: 1.5em 0 0.75em;
  }

  p {
    margin: 1em 0;
  }

  code {
    background: ${props => props.theme.codeBackground};
    padding: 0.2em 0.4em;
    border-radius: 4px;
    font-family: monospace;
  }

  ul, ol {
    margin: 1em 0;
    padding-left: 2em;
  }

  blockquote {
    margin: 1em 0;
    padding-left: 1em;
    border-left: 4px solid ${props => props.theme.borderColor};
    color: ${props => props.theme.textColor}aa;
  }
`;

const CitationContainer = styled.div`
  border: 1px solid ${props => props.theme.borderColor};
  border-radius: 12px;
  margin-bottom: 2rem;
  overflow: hidden;
`;

const CitationHeader = styled.div`
  padding: 1rem 1.5rem;
  background: ${props => props.theme.tableHeaderBackground};
  border-bottom: 1px solid ${props => props.theme.borderColor};
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const CitationContent = styled.div`
`;

const PDFViewer = styled.div`
  height: calc(100vh - 150px);
  margin-top: 1rem;
`;

const PDFFrame = styled.iframe`
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 8px;
`;

const LoadingRow = styled.tr`
  td {
    text-align: center;
    padding: 1.5rem;
    color: ${props => props.theme.primaryButtonColor};
  }
`;

const formatMarkdown = (text) => {
  if (!text) return '';
  
  // Process the text line by line
  let lines = text.split('\n');
  let formattedLines = lines.map(line => {
    // Headers
    if (line.startsWith('# ')) return `<h1>${line.substring(2)}</h1>`;
    if (line.startsWith('## ')) return `<h2>${line.substring(3)}</h2>`;
    if (line.startsWith('### ')) return `<h3>${line.substring(4)}</h3>`;
    if (line.startsWith('#### ')) return `<h4>${line.substring(5)}</h4>`;
    if (line.startsWith('##### ')) return `<h5>${line.substring(6)}</h5>`;
    if (line.startsWith('###### ')) return `<h6>${line.substring(7)}</h6>`;

    // Bold
    line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Code
    line = line.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Lists
    if (line.match(/^-\s/)) {
      return `<ul><li>${line.substring(2)}</li></ul>`;
    }
    if (line.match(/^\d+\.\s/)) {
      return `<ol><li>${line.replace(/^\d+\.\s/, '')}</li></ol>`;
    }
    
    // Blockquotes
    if (line.startsWith('> ')) {
      return `<blockquote>${line.substring(2)}</blockquote>`;
    }
    
    // Regular paragraphs
    return line ? `<p>${line}</p>` : '';
  });

  return formattedLines.join('\n');
};

function ComparisonResults({ wizardData }) {
  const [requirements, setRequirements] = useState([]);
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [streamComplete, setStreamComplete] = useState(false);
  const [activeTab, setActiveTab] = useState('content');
  const isMounted = useRef(true);

  const getPDFUrl = useCallback((citation, index) => {
    const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000'
      : '';
    return `${baseUrl}/pdf/${index}/${encodeURIComponent(citation.document_id)}?is_restricted=false`;
  }, []);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchComparisonResults = async () => {
      try {
        const response = await fetch('/compare', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phase: 'execute',
            ...wizardData,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { value, done } = await reader.read();
          
          if (done) {
            if (isMounted.current) {
              setStreamComplete(true);
              setIsLoading(false);
            }
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line);
                if (data.type === 'comparison_result' && isMounted.current) {
                  setRequirements(prev => [...prev, data.content]);
                } else if (data.type === 'error' && isMounted.current) {
                  setError(data.content);
                }
              } catch (e) {
                console.error('Error parsing JSON:', e);
              }
            }
          }
        }
      } catch (error) {
        if (isMounted.current) {
          setError(error.message);
          setIsLoading(false);
        }
      }
    };

    fetchComparisonResults();
  }, [wizardData]);

  const formatResponse = useCallback((response) => {
    if (typeof response === 'boolean') {
      return {
        icon: response ? faCheckCircle : faTimesCircle,
        type: response ? 'yes' : 'no',
        text: response ? 'Yes' : 'No'
      };
    } else if (typeof response === 'string') {
      const lower = response.toLowerCase();
      if (lower === 'yes' || lower === 'no') {
        return {
          icon: lower === 'yes' ? faCheckCircle : faTimesCircle,
          type: lower === 'yes' ? 'yes' : 'no',
          text: lower === 'yes' ? 'Yes' : 'No'
        };
      } else if (/^\d+(\.\d+)?\s*\w+/.test(response)) {
        return {
          icon: faQuestionCircle,
          type: 'partial',
          text: response
        };
      }
    }
    return {
      icon: faQuestionCircle,
      type: 'partial',
      text: response || 'N/A'
    };
  }, []);

  const handleExport = useCallback(() => {
    const csvContent = [
      ['Requirement', wizardData.indexes[0], wizardData.indexes[1]],
      ...requirements.map(req => [
        `"${req.requirement.description.replace(/"/g, '""')}"`,
        `"${req.sources[wizardData.indexes[0]]?.simplified_value || 'N/A'}"`,
        `"${req.sources[wizardData.indexes[1]]?.simplified_value || 'N/A'}"`,
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'comparison_results.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, [requirements, wizardData.indexes]);

  const handleRowClick = useCallback((requirement) => {
    setSelectedRequirement(requirement);
    setActiveTab('content');
  }, []);

  const renderTabContent = (source, index) => {
    if (activeTab === 'content') {
      return (
        <FormattedContent 
          dangerouslySetInnerHTML={{ 
            __html: formatMarkdown(source?.response || 'No content available') 
          }} 
        />
      );
    }

    return (
      <div>
        {source?.citations?.map((citation, idx) => (
          <CitationContainer key={idx}>
            <CitationHeader>
              <FontAwesomeIcon icon={faQuoteRight} />
              Citation {idx + 1}
            </CitationHeader>
            <CitationContent>
              <div>{citation.text}</div>
              <PDFViewer>
                <PDFFrame
                  src={getPDFUrl(citation, wizardData.indexes[index])}
                  title={`Citation ${idx + 1} from ${wizardData.indexes[index]}`}
                />
              </PDFViewer>
            </CitationContent>
          </CitationContainer>
        ))}
        {(!source?.citations || source.citations.length === 0) && (
          <div style={{ padding: '2rem', textAlign: 'center', color: props => props.theme.textColor }}>
            No citations available
          </div>
        )}
      </div>
    );
  };

  const renderTableView = () => {
    if (error) {
      return (
        <ErrorMessage>
          <FontAwesomeIcon icon={faExclamationTriangle} />
          <span>{error}</span>
        </ErrorMessage>
      );
    }

    return (
      <ComparisonTable>
        <thead>
          <tr>
            <th>Requirement</th>
            <th>{wizardData.indexes[0]}</th>
            <th>{wizardData.indexes[1]}</th>
          </tr>
        </thead>
        <tbody>
          {requirements.map((requirement, index) => {
            const source1 = requirement.sources[wizardData.indexes[0]];
            const source2 = requirement.sources[wizardData.indexes[1]];

            const source1Response = formatResponse(source1?.simplified_value);
            const source2Response = formatResponse(source2?.simplified_value);

            return (
              <tr key={index} onClick={() => handleRowClick(requirement)}>
                <td>{requirement.requirement.description}</td>
                <td>
                  <ResponseValue type={source1Response.type}>
                    <FontAwesomeIcon icon={source1Response.icon} />
                    {source1Response.text}
                  </ResponseValue>
                </td>
                <td>
                  <ResponseValue type={source2Response.type}>
                    <FontAwesomeIcon icon={source2Response.icon} />
                    {source2Response.text}
                  </ResponseValue>
                </td>
              </tr>
            );
          })}
          {isLoading && !streamComplete && (
            <LoadingRow>
              <td colSpan={3}>
                <FontAwesomeIcon icon={faSpinner} spin />
                <span>&nbsp;Loading more results...</span>
              </td>
            </LoadingRow>
          )}
        </tbody>
      </ComparisonTable>
    );
  };

  const renderSideBySideModal = () => {
    if (!selectedRequirement) return null;

    return (
      <ModalOverlay isVisible={!!selectedRequirement} onClick={() => setSelectedRequirement(null)}>
        <SideBySideModal onClick={e => e.stopPropagation()}>
          <ModalHeader>
            <ModalTitle>{selectedRequirement.requirement.description}</ModalTitle>
            <CloseButton onClick={() => setSelectedRequirement(null)}>
              <FontAwesomeIcon icon={faTimes} />
            </CloseButton>
          </ModalHeader>
          
          <SideBySideContainer>
            {wizardData.indexes.map((index, idx) => (
              <SourceColumn key={index}>
                <TabContainer>
                  <Tab 
                    active={activeTab === 'content'} 
                    onClick={() => setActiveTab('content')}
                  >
                    <FontAwesomeIcon icon={faBook} />
                    Content
                  </Tab>
                  <Tab 
                    active={activeTab === 'citations'} 
                    onClick={() => setActiveTab('citations')}
                  >
                    <FontAwesomeIcon icon={faFileAlt} />
                    Citations
                  </Tab>
                </TabContainer>
                <ContentContainer>
                  {renderTabContent(selectedRequirement.sources[index], idx)}
                </ContentContainer>
              </SourceColumn>
            ))}
          </SideBySideContainer>
        </SideBySideModal>
      </ModalOverlay>
    );
  };

  return (
    <ResultsContainer>
      {renderTableView()}
      {!!requirements.length && (
        <ExportButton onClick={handleExport}>
          <FontAwesomeIcon icon={faFileExport} />
          Export Results
        </ExportButton>
      )}
      {renderSideBySideModal()}
    </ResultsContainer>
  );
}

ComparisonResults.propTypes = {
  wizardData: PropTypes.shape({
    indexes: PropTypes.arrayOf(PropTypes.string).isRequired
  }).isRequired
};

export default React.memo(ComparisonResults);