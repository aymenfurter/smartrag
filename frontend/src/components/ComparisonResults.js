import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileExport,
  faCheckCircle,
  faTimesCircle,
  faQuestionCircle,
  faExclamationTriangle
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

function ComparisonResults({ results, wizardData }) {
  const [selectedDetail, setSelectedDetail] = useState(null);

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
      } else if (/^\d+(\.\d+)?\s*\w+/.test(response)) { // Regex to match numeric value with unit
        return {
          icon: faQuestionCircle,
          type: 'partial',
          text: response
        };
      } else {
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
      text: response
    };
  }, []);

  const handleExport = useCallback(() => {
    const csvContent = [
      ['Requirement', wizardData.indexes[0], wizardData.indexes[1]],
      ...results.requirements.map(req => [
        `"${req.requirement.description.replace(/"/g, '""')}"`,
        `"${req.sources[wizardData.indexes[0]].simplified_value || 'N/A'}"`,
        `"${req.sources[wizardData.indexes[1]].simplified_value || 'N/A'}"`,
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
  }, [results, wizardData]);

  const handleRowClick = (requirement, indexName) => {
    setSelectedDetail({ requirement, indexName });
  };

  const renderTableView = () => {
    if (!results || !results.requirements || results.requirements.length === 0) {
      return (
        <ErrorMessage>
          <FontAwesomeIcon icon={faExclamationTriangle} />
          <span>No results available to display.</span>
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
          {results.requirements.map((requirement, index) => {
            const source1 = requirement.sources[wizardData.indexes[0]];
            const source2 = requirement.sources[wizardData.indexes[1]];

            const source1Response = formatResponse(source1.simplified_value || 'N/A');
            const source2Response = formatResponse(source2.simplified_value || 'N/A');

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
                    <Citation href={citation.url} target="_blank" rel="noopener noreferrer">
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
      <ExportButton onClick={handleExport}>
        <FontAwesomeIcon icon={faFileExport} />
        Export Results
      </ExportButton>
      {renderDetailModal()}
    </ResultsContainer>
  );
}

ComparisonResults.propTypes = {
  results: PropTypes.shape({
    requirements: PropTypes.arrayOf(PropTypes.shape({
      requirement: PropTypes.shape({
        description: PropTypes.string.isRequired,
        metric_type: PropTypes.string.isRequired,
        metric_unit: PropTypes.string
      }).isRequired,
      sources: PropTypes.objectOf(PropTypes.shape({
        response: PropTypes.string.isRequired,
        simplified_value: PropTypes.string,
        citations: PropTypes.arrayOf(PropTypes.shape({
          url: PropTypes.string.isRequired,
          text: PropTypes.string,
          document_id: PropTypes.string,
          content: PropTypes.string,
          relevance_score: PropTypes.number
        }))
      })).isRequired
    })).isRequired
  }),
  wizardData: PropTypes.shape({
    indexes: PropTypes.arrayOf(PropTypes.string).isRequired
  }).isRequired
};

ComparisonResults.defaultProps = {
  results: {
    requirements: []
  }
};

export default React.memo(ComparisonResults);
