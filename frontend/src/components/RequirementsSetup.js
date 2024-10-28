import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserTie,
  faSearch,
  faBuilding,
  faExclamationCircle
} from '@fortawesome/free-solid-svg-icons';

const SetupForm = styled.form`
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

const FormSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SectionTitle = styled.h3`
  color: ${props => props.theme.titleColor};
  font-size: 1.25rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  color: ${props => props.theme.textColor};
  font-size: 0.875rem;
  font-weight: 500;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.inputBorder};
  border-radius: 8px;
  font-size: 1rem;
  background: ${props => props.theme.inputBackground};
  color: ${props => props.theme.inputText};
  transition: all 0.2s ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.primaryButtonColor};
    box-shadow: 0 0 0 2px ${props => props.theme.primaryButtonColor}20;
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.inputBorder};
  border-radius: 8px;
  font-size: 1rem;
  background: ${props => props.theme.inputBackground};
  color: ${props => props.theme.inputText};
  cursor: pointer;
  transition: all 0.2s ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.primaryButtonColor};
    box-shadow: 0 0 0 2px ${props => props.theme.primaryButtonColor}20;
  }
`;

const IndexGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
  width: 100%;
  box-sizing: border-box;
`;

const IndexCard = styled.div`
  padding: 1rem;
  border: 2px solid ${props => props.selected ? props.theme.primaryButtonColor : props.theme.borderColor};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  background: ${props => props.selected ? `${props.theme.primaryButtonColor}10` : props.theme.cardBackground};
  box-sizing: border-box;

  &:hover {
    border-color: ${props => props.theme.primaryButtonColor};
    transform: translateY(-2px);
  }
`;

const IndexName = styled.h4`
  color: ${props => props.theme.titleColor};
  margin-bottom: 0.5rem;
`;

const IndexDescription = styled.p`
  color: ${props => props.theme.textColor};
  font-size: 0.875rem;
  line-height: 1.4;
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

function RequirementsSetup({ indexes, initialData, onSubmit }) {
  const [formData, setFormData] = useState({
    role: initialData.role || 'auditor',
    num_requirements: initialData.num_requirements || 10,
    comparison_subject: initialData.comparison_subject || 'employment conditions',
    comparison_target: initialData.comparison_target || 'Hospital',
    indexes: initialData.indexes || []
  });

  const [errors, setErrors] = useState({});

  const validateForm = useCallback(() => {
    const newErrors = {};
    
    if (!formData.role.trim()) {
      newErrors.role = 'Role is required';
    }
    if (!formData.comparison_subject.trim()) {
      newErrors.comparison_subject = 'Comparison subject is required';
    }
    if (!formData.comparison_target.trim()) {
      newErrors.comparison_target = 'Comparison target is required';
    }
    if (formData.indexes.length !== 2) {
      newErrors.indexes = 'Exactly 2 indexes must be selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  }, [formData, validateForm, onSubmit]);

  const handleIndexToggle = useCallback((indexName) => {
    setFormData(prev => {
      const currentIndexes = [...prev.indexes];
      const index = currentIndexes.indexOf(indexName);
      
      if (index === -1 && currentIndexes.length < 2) {
        currentIndexes.push(indexName);
      } else if (index !== -1) {
        currentIndexes.splice(index, 1);
      }

      return {
        ...prev,
        indexes: currentIndexes
      };
    });
  }, []);

  const renderForm = () => {
    return (
      <SetupForm
        id="step-1-form"
        onSubmit={handleSubmit}
      >
        {/* Basic Settings Section */}
        <FormSection>
          <SectionTitle>
            <FontAwesomeIcon icon={faUserTie} />
            Basic Settings
          </SectionTitle>
          <InputGroup>
            <Label htmlFor="role">Role</Label>
            <Select
              id="role"
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
            >
              <option value="auditor">Auditor</option>
              <option value="analyst">Analyst</option>
              <option value="researcher">Researcher</option>
            </Select>
            {errors.role && (
              <ErrorMessage>
                <FontAwesomeIcon icon={faExclamationCircle} />
                <span>{errors.role}</span>
              </ErrorMessage>
            )}
          </InputGroup>
          <InputGroup>
            <Label htmlFor="num_requirements">Number of Requirements</Label>
            <Input
              type="number"
              id="num_requirements"
              min="1"
              max="20"
              value={formData.num_requirements}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                num_requirements: parseInt(e.target.value, 2) 
              }))}
            />
          </InputGroup>
        </FormSection>

        {/* Comparison Details Section */}
        <FormSection>
          <SectionTitle>
            <FontAwesomeIcon icon={faSearch} />
            Comparison Details
          </SectionTitle>
          <InputGroup>
            <Label htmlFor="comparison_subject">What is being compared?</Label>
            <Input
              id="comparison_subject"
              value={formData.comparison_subject}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                comparison_subject: e.target.value 
              }))}
            />
            {errors.comparison_subject && (
              <ErrorMessage>
                <FontAwesomeIcon icon={faExclamationCircle} />
                <span>{errors.comparison_subject}</span>
              </ErrorMessage>
            )}
          </InputGroup>
          <InputGroup>
            <Label htmlFor="comparison_target">Comparison Target</Label>
            <Input
              id="comparison_target"
              value={formData.comparison_target}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                comparison_target: e.target.value 
              }))}
            />
            {errors.comparison_target && (
              <ErrorMessage>
                <FontAwesomeIcon icon={faExclamationCircle} />
                <span>{errors.comparison_target}</span>
              </ErrorMessage>
            )}
          </InputGroup>
        </FormSection>

        {/* Index Selection Section */}
        <FormSection>
          <SectionTitle>
            <FontAwesomeIcon icon={faBuilding} />
            Select Data Sources (2)
          </SectionTitle>
          <IndexGrid>
            {indexes.map(([name, description]) => (
              <IndexCard
                key={name}
                selected={formData.indexes.includes(name)}
                onClick={() => handleIndexToggle(name)}
              >
                <IndexName>{name}</IndexName>
                <IndexDescription>{description}</IndexDescription>
              </IndexCard>
            ))}
          </IndexGrid>
          {errors.indexes && (
            <ErrorMessage>
              <FontAwesomeIcon icon={faExclamationCircle} />
              <span>{errors.indexes}</span>
            </ErrorMessage>
          )}
        </FormSection>
      </SetupForm>
    );
  };

  return renderForm();
}

RequirementsSetup.propTypes = {
  indexes: PropTypes.arrayOf(PropTypes.array).isRequired,
  initialData: PropTypes.shape({
    role: PropTypes.string,
    num_requirements: PropTypes.number,
    comparison_subject: PropTypes.string,
    comparison_target: PropTypes.string,
    indexes: PropTypes.arrayOf(PropTypes.string)
  }),
  onSubmit: PropTypes.func.isRequired
};

RequirementsSetup.defaultProps = {
  initialData: {
    role: 'auditor',
    num_requirements: 2,
    comparison_subject: 'employment conditions',
    comparison_target: 'Hospital',
    indexes: []
  }
};

export default React.memo(RequirementsSetup);
