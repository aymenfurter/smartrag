import React, { useState, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faEdit,
  faCheck,
  faExclamationCircle,
  faTrash
} from '@fortawesome/free-solid-svg-icons';

const Container = styled.div`
  width: 100%;
  min-height: 400px;
  box-sizing: border-box;
`;

const ReviewContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 2rem;
  border-radius: 12px;
  background: ${props => props.theme.cardBackground};
  box-sizing: border-box;
`;

const RequirementsList = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const RequirementCard = styled.div`
  width: 100%;
  padding: 1.5rem;
  border: 1px solid ${({ theme }) => theme.borderColor};
  border-radius: 8px;
  background: ${({ theme }) => theme.backgroundColor};
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;

  ${({ isEditing, theme }) => isEditing && `
    border-color: ${theme.primaryButtonColor};
    box-shadow: 0 0 0 2px ${theme.primaryButtonColor}20;
  `}
`;

const RequirementHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const RequirementTitle = styled.h4`
  color: ${({ theme }) => theme.titleColor};
  font-weight: 600;
  margin: 0;
  font-size: 1.1rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const IconButton = styled.button`
  padding: 0.5rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: ${({ theme }) => theme.textColor};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.buttonHoverBackground};
    color: ${({ theme }) => theme.primaryButtonColor};
  }
`;

const ContentArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const RequirementText = styled.p`
  color: ${({ theme }) => theme.textColor};
  margin: 0;
  font-size: 1rem;
  line-height: 1.5;
`;

const MetricBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  background: ${({ theme }) => `${theme.primaryButtonColor}15`};
  color: ${({ theme }) => theme.primaryButtonColor};
  border-radius: 16px;
  font-size: 0.875rem;
  font-weight: 500;
  width: fit-content;
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => props => props.theme.inputBorder};
  border-radius: 8px;
  font-size: 1rem;
  background: ${({ theme }) => props => props.theme.inputBackground};
  color: ${({ theme }) => props => props.theme.inputText};
  resize: vertical;
  min-height: 100px;
  transition: all 0.2s ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.primaryButtonColor};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.primaryButtonColor}20;
  }
`;

const MetricSelect = styled.select`
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => props => props.theme.inputBorder};
  border-radius: 8px;
  background: ${({ theme }) => props => props.theme.inputBackground};
  color: ${({ theme }) => props => props.theme.inputText};
  font-size: 1rem;
  margin-top: 0.5rem;
  width: 200px;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.primaryButtonColor};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.primaryButtonColor}20;
  }
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const LoadingSpinner = styled.div`
  color: white;
  font-size: 2rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: ${({ theme }) => theme.textColor};
  font-size: 1.1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
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

function RequirementsReview({ wizardData, onSubmit, isLoading }) {
  const [requirements, setRequirements] = useState([]);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Ref to track component mount status
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Cache for requirements
  const requirementsCache = useRef(null);

  const generateRequirements = useCallback(async () => {
    // If requirements are cached, use cache
    if (requirementsCache.current) {
      setRequirements(requirementsCache.current);
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch('/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: 'generate',
          ...wizardData
        })
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let done = false;
      let accumulatedRequirements = [];

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop(); // Save the incomplete line

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.type === 'requirements' && Array.isArray(data.content)) {
                accumulatedRequirements.push(...data.content);
                // Optionally, you can update the state incrementally here
              } else if (data.type === 'error') {
                throw new Error(data.content);
              }
            } catch (e) {
              console.error('Error parsing JSON:', e);
              throw e;
            }
          }
        }
      }

      // Handle any remaining buffer
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer);
          if (data.type === 'requirements' && Array.isArray(data.content)) {
            accumulatedRequirements.push(...data.content);
          } else if (data.type === 'error') {
            throw new Error(data.content);
          }
        } catch (e) {
          console.error('Error parsing JSON:', e);
          throw e;
        }
      }

      if (isMounted.current) {
        setRequirements(accumulatedRequirements);
        // Cache the requirements
        requirementsCache.current = accumulatedRequirements;
      }
    } catch (error) {
      console.error('Error generating requirements:', error);
      if (isMounted.current) {
        setError('Failed to generate requirements. Please try again.');
      }
    } finally {
      if (isMounted.current) {
        setIsGenerating(false);
      }
    }
  }, [wizardData]);

  useEffect(() => {
    // Only generate requirements if not already loaded
    if (requirements.length === 0 && !isGenerating && !error) {
      generateRequirements();
    }
  }, [generateRequirements, requirements.length, isGenerating, error]);

  const handleEdit = useCallback((index) => {
    setEditingIndex(index);
  }, []);

  const handleSave = useCallback((index, updatedRequirement) => {
    setRequirements(prev => {
      const updated = [...prev];
      updated[index] = updatedRequirement;
      // Update cache
      requirementsCache.current = updated;
      return updated;
    });
    setEditingIndex(-1);
  }, []);

  const handleDelete = useCallback((index) => {
    setRequirements(prev => {
      const updated = prev.filter((_, i) => i !== index);
      // Update cache
      requirementsCache.current = updated;
      return updated;
    });
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (requirements.length > 0) {
      onSubmit(requirements);
    }
  }, [requirements, onSubmit]);

  const renderRequirement = useCallback((requirement, index) => {
    const isEditing = editingIndex === index;

    if (isEditing) {
      return (
        <RequirementCard key={index} isEditing={true}>
          <ContentArea>
            <TextArea
              defaultValue={requirement.description}
              onChange={(e) => {
                const updated = { ...requirement, description: e.target.value };
                handleSave(index, updated);
              }}
              placeholder="Enter requirement description"
            />
            <MetricSelect
              value={requirement.metric_type || 'yes_no'}
              onChange={(e) => {
                const updated = { ...requirement, metric_type: e.target.value };
                handleSave(index, updated);
              }}
            >
              <option value="yes_no">Yes/No</option>
              <option value="numeric">Numeric</option>
            </MetricSelect>
            <ButtonGroup>
              <IconButton onClick={() => handleSave(index, requirement)} title="Save">
                <FontAwesomeIcon icon={faCheck} />
              </IconButton>
            </ButtonGroup>
          </ContentArea>
        </RequirementCard>
      );
    }

    return (
      <RequirementCard key={index}>
        <RequirementHeader>
          <RequirementTitle>Requirement {index + 1}</RequirementTitle>
          <ButtonGroup>
            <IconButton onClick={() => handleEdit(index)} title="Edit">
              <FontAwesomeIcon icon={faEdit} />
            </IconButton>
            <IconButton onClick={() => handleDelete(index)} title="Delete">
              <FontAwesomeIcon icon={faTrash} />
            </IconButton>
          </ButtonGroup>
        </RequirementHeader>
        <ContentArea>
          <RequirementText>{requirement.description}</RequirementText>
          <MetricBadge>
            Metric: {requirement.metric_type === 'yes_no' ? 'Yes/No' : 'Numeric'}
          </MetricBadge>
        </ContentArea>
      </RequirementCard>
    );
  }, [editingIndex, handleEdit, handleSave, handleDelete]);

  return (
    <Container>
      <form id="step-2-form" onSubmit={handleSubmit}>
        <ReviewContainer>
          {error && (
            <ErrorMessage>
              <FontAwesomeIcon icon={faExclamationCircle} />
              <span>{error}</span>
            </ErrorMessage>
          )}
          {isGenerating && requirements.length === 0 ? (
            <EmptyState>
              <FontAwesomeIcon icon={faSpinner} spin />
              <p>Generating requirements...</p>
            </EmptyState>
          ) : (
            <RequirementsList>
              {requirements.map(renderRequirement)}
              {isGenerating && (
                <LoadingSpinner>
                  <FontAwesomeIcon icon={faSpinner} spin />
                </LoadingSpinner>
              )}
            </RequirementsList>
          )}
        </ReviewContainer>
      </form>
      {isLoading && (
        <LoadingOverlay>
          <LoadingSpinner>
            <FontAwesomeIcon icon={faSpinner} spin />
          </LoadingSpinner>
        </LoadingOverlay>
      )}
    </Container>
  );
}

RequirementsReview.propTypes = {
  wizardData: PropTypes.shape({
    role: PropTypes.string.isRequired,
    num_requirements: PropTypes.number.isRequired,
    comparison_subject: PropTypes.string.isRequired,
    comparison_target: PropTypes.string.isRequired,
    indexes: PropTypes.arrayOf(PropTypes.string).isRequired
  }).isRequired,
  onSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired
};

export default React.memo(RequirementsReview);
