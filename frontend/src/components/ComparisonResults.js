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
  faSpinner
} from '@fortawesome/free-solid-svg-icons';

const ResultsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  background: ${props => props.theme.cardBackground};
  padding: 2rem;
  border-radius: 12px;
  box-sizing: border-box;
  width: 100%;
`;

const ComparisonTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 1rem;

  th, td {
    border: 1px solid ${props => props.theme.borderColor};
    padding: 1rem;
    text-align: left;
  }

  th {
    background: ${props => props.theme.tableHeaderBackground};
    font-weight: 600;
  }

  tr:nth-child(even) {
    background: ${props => props.theme.tableRowEvenBackground};
  }

  tr:hover {
    background: ${props => props.theme.tableRowHoverBackground};
  }

  td.clickable {
    cursor: pointer;
    color: ${props => props.theme.linkColor};
  }

  td.clickable:hover {
    text-decoration: underline;
  }
`;

const ResponseValue = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  ${props => props.type === 'yes' && `color: ${props.theme.successColor};`}
  ${props => props.type === 'no' && `color: ${props.theme.errorColor};`}
  ${props => props.type === 'partial' && `color: ${props.theme.warningColor};`}
`;

const Citation = styled.a`
  color: ${props => props.theme.linkColor};
  text-decoration: none;
  font-size: 0.875rem;
  cursor: pointer;
  
  &:hover {
    text-decoration: underline;
  }
`;

const ExportButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: ${props => props.theme.primaryButtonColor};
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  align-self: flex-end;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.primaryButtonHover};
  }
`;

const ErrorMessage = styled.div`
  color: ${props => props.theme.errorColor};
  background-color: ${props => props.theme.errorBackground};
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.5);
  display: ${props => props.isVisible ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: ${props => props.theme.cardBackground};
  padding: 2rem;
  border-radius: 12px;
  width: 80%;
  max-width: 600px;
  box-sizing: border-box;
  position: relative;
  max-height: 80vh;
  overflow-y: auto;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: transparent;
  border: none;
  color: ${props => props.theme.textColor};
  font-size: 1.5rem;
  cursor: pointer;
`;

const LoadingRow = styled.tr`
  td {
    text-align: center;
    padding: 1rem;
    color: ${props => props.theme.primaryButtonColor};
  }
`;

function ComparisonResults({ wizardData }) {
  const [requirements, setRequirements] = useState([]);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [streamComplete, setStreamComplete] = useState(false);
  
  const isMounted = useRef(true);

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

  const handleRowClick = useCallback((requirement, indexName) => {
    setSelectedDetail({ requirement, indexName });
  }, []);

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
              <tr key={index}>
                <td>{requirement.requirement.description}</td>
                <td
                  className="clickable"
                  onClick={() => handleRowClick(requirement, wizardData.indexes[0])}
                >
                  <ResponseValue type={source1Response.type}>
                    <FontAwesomeIcon icon={source1Response.icon} />
                    {source1Response.text}
                  </ResponseValue>
                </td>
                <td
                  className="clickable"
                  onClick={() => handleRowClick(requirement, wizardData.indexes[1])}
                >
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
                <span className="ml-2">&nbsp;Loading more results...</span>
              </td>
            </LoadingRow>
          )}
        </tbody>
      </ComparisonTable>
    );
  };

  const renderDetailModal = () => {
    if (!selectedDetail) return null;

    const { requirement, indexName } = selectedDetail;
    const source = requirement.sources[indexName];

    return (
      <ModalOverlay isVisible={!!selectedDetail}>
        <ModalContent>
          <CloseButton onClick={() => setSelectedDetail(null)}>&times;</CloseButton>
          <h2>{requirement.requirement.description}</h2>
          <p><strong>Source:</strong> {indexName}</p>
          <p><strong>Detailed Response:</strong></p>
          <p>{source.response}</p>
          {source.citations && source.citations.length > 0 && (
            <>
              <p><strong>Citations:</strong></p>
              <ul>
                {source.citations.map((citation, i) => (
                  <li key={i}>
                    <Citation>
                      [{i + 1}] {citation.text}
                    </Citation>
                  </li>
                ))}
              </ul>
            </>
          )}
        </ModalContent>
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
      {renderDetailModal()}
    </ResultsContainer>
  );
}

ComparisonResults.propTypes = {
  wizardData: PropTypes.shape({
    indexes: PropTypes.arrayOf(PropTypes.string).isRequired
  }).isRequired
};

export default React.memo(ComparisonResults);