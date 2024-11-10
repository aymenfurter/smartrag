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

const Slider = styled.input`
  -webkit-appearance: none;
  width: 100%;
  height: 8px;
  border-radius: 5px;
  background: ${props => props.theme.sliderBackground || props.theme.primaryButtonHover};
  outline: none;
  margin: 0.5rem 0;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${props => props.theme.primaryButtonColor};
    cursor: pointer;
    transition: background 0.2s ease;
  }

  &::-webkit-slider-thumb:hover {
    background: ${props => props.theme.primaryButtonHover};
  }

  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${props => props.theme.primaryButtonColor};
    cursor: pointer;
    transition: background 0.2s ease;
  }

  &::-moz-range-thumb:hover {
    background: ${props => props.theme.primaryButtonHover};
  }
`;

const SliderValue = styled.span`
  font-size: 1rem;
  color: ${props => props.theme.textColor};
  margin-left: 0.5rem;
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
  font-size: 1.1rem;
  font-weight: 600;
`;

const IndexDescription = styled.p`
  color: ${props => props.theme.textColor};
  font-size: 0.875rem;
  line-height: 1.4;
  margin: 0;
`;

const ErrorMessage = styled.div`
  color: ${props => props.theme.errorColor};
  background-color: ${props => props.theme.errorBackground};
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
`;

const ValidationMessage = styled.div`
  color: ${props => props.theme.errorColor};
  font-size: 0.75rem;
  margin-top: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

function RequirementsSetup({ indexes, initialData, onSubmit }) {
  const [formData, setFormData] = useState({
    role: initialData?.role || 'auditor',
    num_requirements: initialData?.num_requirements || 5,
    comparison_subject: initialData?.comparison_subject || 'employment conditions',
    comparison_target: initialData?.comparison_target || 'Hospital',
    indexes: initialData?.indexes || []
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = useCallback((name, value) => {
    switch (name) {
      case 'role':
        return !value.trim() ? 'Role is required' : '';
      case 'comparison_subject':
        return !value.trim() ? 'Comparison subject is required' : '';
      case 'comparison_target':
        return !value.trim() ? 'Comparison target is required' : '';
      case 'indexes':
        return value.length !== 2 ? 'Select exactly 2 indexes' : '';
      default:
        return '';
    }
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) {
        newErrors[key] = error;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, validateField]);

  const handleFieldChange = useCallback((name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  }, [validateField]);

  const handleIndexToggle = useCallback((indexName) => {
    setFormData(prev => {
      const currentIndexes = [...prev.indexes];
      const index = currentIndexes.indexOf(indexName);
      
      if (index === -1 && currentIndexes.length < 2) {
        currentIndexes.push(indexName);
      } else if (index !== -1) {
        currentIndexes.splice(index, 1);
      }

      const newIndexes = [...currentIndexes];
      setTouched(prev => ({ ...prev, indexes: true }));
      const error = validateField('indexes', newIndexes);
      setErrors(prev => ({ ...prev, indexes: error }));

      return {
        ...prev,
        indexes: newIndexes
      };
    });
  }, [validateField]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    setTouched(Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
    
    if (validateForm()) {
      onSubmit(formData);
    }
  }, [formData, validateForm, onSubmit]);

  return (
    <SetupForm id="step-1-form" onSubmit={handleSubmit}>
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
            onChange={(e) => handleFieldChange('role', e.target.value)}
            onBlur={() => setTouched(prev => ({ ...prev, role: true }))}
          >
            <option value="auditor">Auditor</option>
            <option value="analyst">Analyst</option>
            <option value="researcher">Researcher</option>
            <option value="manager">Manager</option>
          </Select>
          {touched.role && errors.role && (
            <ValidationMessage>
              <FontAwesomeIcon icon={faExclamationCircle} size="sm" />
              {errors.role}
            </ValidationMessage>
          )}
        </InputGroup>
        <InputGroup>
          <Label htmlFor="num_requirements">
            Number of Requirements: {formData.num_requirements}
          </Label>
          <Slider
            type="range"
            id="num_requirements"
            min="1"
            max="20"
            value={formData.num_requirements}
            onChange={(e) => handleFieldChange('num_requirements', parseInt(e.target.value, 10))}
          />
        </InputGroup>
      </FormSection>

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
            onChange={(e) => handleFieldChange('comparison_subject', e.target.value)}
            onBlur={() => setTouched(prev => ({ ...prev, comparison_subject: true }))}
          />
          {touched.comparison_subject && errors.comparison_subject && (
            <ValidationMessage>
              <FontAwesomeIcon icon={faExclamationCircle} size="sm" />
              {errors.comparison_subject}
            </ValidationMessage>
          )}
        </InputGroup>
        <InputGroup>
          <Label htmlFor="comparison_target">Comparison Target</Label>
          <Input
            id="comparison_target"
            value={formData.comparison_target}
            onChange={(e) => handleFieldChange('comparison_target', e.target.value)}
            onBlur={() => setTouched(prev => ({ ...prev, comparison_target: true }))}
          />
          {touched.comparison_target && errors.comparison_target && (
            <ValidationMessage>
              <FontAwesomeIcon icon={faExclamationCircle} size="sm" />
              {errors.comparison_target}
            </ValidationMessage>
          )}
        </InputGroup>
      </FormSection>

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
        {touched.indexes && errors.indexes && (
          <ValidationMessage>
            <FontAwesomeIcon icon={faExclamationCircle} size="sm" />
            {errors.indexes}
          </ValidationMessage>
        )}
      </FormSection>
    </SetupForm>
  );
}

RequirementsSetup.propTypes = {
  indexes: PropTypes.arrayOf(
    PropTypes.arrayOf(PropTypes.string)
  ).isRequired,
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
    num_requirements: 5,
    comparison_subject: 'employment conditions',
    comparison_target: 'Hospital',
    indexes: []
  }
};

export default React.memo(RequirementsSetup);