import React, { useState, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faSpinner,
  faArrowRight,
  faArrowLeft,
  faListCheck,
  faGears,
  faChartLine,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

import RequirementsSetup from './RequirementsSetup';
import RequirementsReview from './RequirementsReview';
import ComparisonResults from './ComparisonResults';

const WizardContainer = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  background-color: ${props => props.theme.backgroundColor};
  box-sizing: border-box;
`;

const StepsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3rem;
  position: relative;
  padding: 0 2rem;
  width: 100%;
  box-sizing: border-box;

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 2px;
    background-color: ${props => props.theme.borderColor};
    z-index: 1;
  }
`;

const Step = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  z-index: 2;
  background-color: ${props => props.theme.backgroundColor};
  padding: 0 1rem;
`;

const StepIcon = styled.div`
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => 
    props.active ? props.theme.primaryButtonColor :
    props.completed ? props.theme.primaryButtonColor :
    props.theme.cardBackground};
  color: ${props => props.active || props.completed ? 'white' : props.theme.textColor};
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const StepLabel = styled.span`
  font-size: 0.875rem;
  color: ${props => 
    props.active ? props.theme.primaryButtonColor :
    props.completed ? props.theme.primaryButtonColor :
    props.theme.textColor};
  font-weight: ${props => props.active ? '600' : '400'};
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
  padding: 1rem 0;
  border-top: 1px solid ${props => props.theme.borderColor};
  width: 100%;
  box-sizing: border-box;
`;

const WizardButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.2s ease;
  cursor: pointer;
  
  ${props => props.primary ? `
    background-color: ${props.theme.primaryButtonColor};
    color: white;
    border: none;
    
    &:hover {
      background-color: ${props.theme.primaryButtonHover};
    }
  ` : `
    background-color: transparent;
    color: ${props.theme.textColor};
    border: 1px solid ${props.theme.borderColor};
    
    &:hover {
      background-color: ${props.theme.cardBackground};
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: ${props => props.theme.errorBackground};
  color: ${props => props.theme.errorColor};
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  width: 100%;
  box-sizing: border-box;
`;

function ComparisonWizard({ indexes, onClose }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    role: 'auditor',
    num_requirements: 10,
    comparison_subject: 'employment conditions',
    comparison_target: 'Hospital',
    indexes: [],
    requirements: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const isMounted = useRef(true);
  const requirementsCache = useRef(null);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const steps = [
    { icon: faListCheck, label: 'Setup', component: RequirementsSetup },
    { icon: faGears, label: 'Review', component: RequirementsReview },
    { icon: faChartLine, label: 'Results', component: ComparisonResults }
  ];

  const handleRequirementsSetup = useCallback((data) => {
    setWizardData(prev => ({ ...prev, ...data }));
    setCurrentStep(2);
  }, []);

  const handleRequirementsReview = useCallback(async (requirements) => {
    if (!isMounted.current) return;

    // Cache the requirements for potential reuse
    requirementsCache.current = requirements;
    setWizardData(prev => ({ ...prev, requirements }));
    setCurrentStep(3);
  }, []);

  const handleBack = useCallback(() => {
    setError(null);
    setCurrentStep(prev => Math.max(1, prev - 1));
  }, []);

  const renderStepContent = useCallback(() => {
    const StepComponent = steps[currentStep - 1].component;
    
    if (currentStep === 1) {
      return (
        <StepComponent
          indexes={indexes}
          initialData={wizardData}
          onSubmit={handleRequirementsSetup}
        />
      );
    }
    
    if (currentStep === 2) {
      return (
        <StepComponent
          wizardData={wizardData}
          isLoading={isLoading}
          onSubmit={handleRequirementsReview}
        />
      );
    }
    
    if (currentStep === 3) {
      return (
        <StepComponent
          wizardData={wizardData}
        />
      );
    }
  }, [currentStep, indexes, wizardData, isLoading, handleRequirementsSetup, handleRequirementsReview, steps]);

  const renderSteps = useCallback(() => (
    <StepsContainer>
      {steps.map((step, index) => (
        <Step key={step.label}>
          <StepIcon
            active={currentStep === index + 1}
            completed={currentStep > index + 1}
          > 
            <FontAwesomeIcon 
              icon={currentStep > index + 1 ? faCheckCircle :
                    isLoading && currentStep === index + 1 ? faSpinner :
                    step.icon}
              spin={isLoading && currentStep === index + 1}
            />
          </StepIcon>
          <StepLabel
            active={currentStep === index + 1}
            completed={currentStep > index + 1}
          >
            {step.label}
          </StepLabel>
        </Step>
      ))}
    </StepsContainer>
  ), [currentStep, isLoading, steps]);

  return (
    <WizardContainer>
      {renderSteps()}
      {error && (
        <ErrorContainer>
          <FontAwesomeIcon icon={faExclamationTriangle} />
          <span>{error}</span>
        </ErrorContainer>
      )}
      {renderStepContent()}
      <ButtonContainer>
        {currentStep > 1 && (
          <WizardButton
            onClick={handleBack}
            disabled={isLoading}
            title="Go back to previous step"
          > 
            <FontAwesomeIcon icon={faArrowLeft} />
            Back
          </WizardButton>
        )}
        {currentStep < 3 && (
          <WizardButton
            primary
            form={`step-${currentStep}-form`}
            type='submit'
            disabled={isLoading}
            title="Proceed to next step"
          >
            Next
            <FontAwesomeIcon icon={faArrowRight} />
          </WizardButton>
        )}
        {currentStep === 3 && (
          <WizardButton
            primary
            onClick={onClose}
            title="Close the wizard"
          >
            Close
            <FontAwesomeIcon icon={faArrowRight} />
          </WizardButton>
        )}
      </ButtonContainer>
    </WizardContainer>
  );
}

ComparisonWizard.propTypes = {
  indexes: PropTypes.arrayOf(PropTypes.array).isRequired,
  onClose: PropTypes.func.isRequired
};

export default React.memo(ComparisonWizard);