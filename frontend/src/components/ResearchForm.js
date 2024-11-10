import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styled, { keyframes } from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSearch,
  faSpinner,
  faCheck,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

// Animations
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideIn = keyframes`
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

// Container Components
const FormContainer = styled.div`
  background-color: ${props => props.theme.backgroundColor};
  border-radius: 15px;
  margin-bottom: 30px;
  animation: ${fadeIn} 0.5s ease-out;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
`;


const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
  background-color: ${props => props.theme.cardBackground};
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
`;

const SearchContainer = styled.div`
  position: relative;
  margin-bottom: 20px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 15px;
  border: 2px solid ${props => props.theme.inputBorder};
  border-radius: 12px;
  font-size: 16px;
  background-color: ${props => props.theme.inputBackground};
  color: ${props => props.theme.inputText};
  transition: all 0.3s ease;
  padding-right: 50px;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.focusBorderColor};
    box-shadow: 0 0 0 3px ${props => props.theme.focusBoxShadow};
  }

  &::placeholder {
    color: #999999;
  }
`;

const SearchIcon = styled(FontAwesomeIcon)`
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: ${props => props.theme.searchIconColor};
  font-size: 20px;
`;

const DataSourcesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 25px;
  margin-bottom: 25px;
`;

const DataSourceCard = styled.div`
  background-color: ${props => props.theme.cardBackground};
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
  border: 2px solid ${props => props.selected ? props.theme.primaryButtonColor : props.theme.borderColor};
  display: flex;
  flex-direction: column;
  cursor: pointer;
  position: relative;
  box-shadow: ${props => props.selected 
    ? `0 8px 20px ${props.theme.primaryButtonColor}20`
    : '0 4px 6px rgba(0, 0, 0, 0.1)'};

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  }
`;

const SelectionIndicator = styled.div`
  position: absolute;
  top: 16px;
  right: 16px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: ${props => props.selected ? props.theme.primaryButtonColor : 'transparent'};
  border: 2px solid ${props => props.selected ? props.theme.primaryButtonColor : props.theme.inputBorder};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  transition: all 0.3s ease;
`;

const DataSourceTitle = styled.h3`
  color: ${props => props.theme.titleColor};
  margin-bottom: 15px;
  font-size: 20px;
  font-weight: 600;
  padding-right: 30px;
`;

const DataSourceDescription = styled.p`
  color: ${props => props.theme.messageText};
  font-size: 16px;
  line-height: 1.5;
  flex-grow: 1;
  opacity: 0.8;
`;

const SettingsContainer = styled.div`
  padding-top: 25px;
  border-top: 1px solid ${props => props.theme.borderColor};
`;

const CheckboxContainer = styled.label`
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  cursor: pointer;
  padding: 12px;
  border-radius: 8px;
  transition: all 0.3s ease;

  &:hover {
    background-color: ${props => props.theme.inputBackground};
  }
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

const ResearchDepthContainer = styled.div`
  margin: 20px 0;
  padding: 20px;
  background-color: ${props => props.theme.cardBackground};
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  label {
    display: block;
    margin-bottom: 15px;
    color: ${props => props.theme.titleColor};
    font-weight: 600;
    font-size: 16px;
  }

  input[type="range"] {
    width: 100%;
    -webkit-appearance: none;
    height: 6px;
    border-radius: 3px;
    background: ${props => props.theme.inputBorder};
    margin-bottom: 20px;

    &::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: ${props => props.theme.primaryButtonColor};
      cursor: pointer;
      transition: all 0.2s ease;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }
  }
`;

const ResearchStats = styled.div`
  margin-top: 15px;
  padding: 15px;
  border-radius: 8px;
  background-color: ${props => `${props.theme.primaryButtonColor}10`};
  border: 1px solid ${props => `${props.theme.primaryButtonColor}30`};
  
  p {
    margin: 8px 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: ${props => props.theme.inputText};
    font-size: 14px;
    
    span:last-child {
      font-weight: 600;
      color: ${props => props.theme.primaryButtonColor};
    }
  }
`;

const ResearchForm = ({ 
  question,
  dataSources,
  maxRounds,
  useGraphrag = true,
  isResearching,
  indexes,
  onQuestionChange,
  onDataSourceChange,
  onGraphragToggle,
  onMaxRoundsChange,
  onSubmit 
}) => {
  // This is now an array of complete data source objects
  const [selectedSources, setSelectedSources] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
  };

  const toggleDataSource = (indexName, description) => {
    let newSources = Array.from(selectedSources);
    const existingIdx = newSources.findIndex(s => s.index === indexName);

    if (existingIdx >= 0) {
      newSources.splice(existingIdx, 1);
    } else {
      newSources.push({
        index: indexName,
        name: indexName,
        description: description,
        isExpanded: false,
        isRestricted: false
      });
    }

    setSelectedSources(newSources);
    onDataSourceChange(newSources);
  };

  const isSourceSelected = (indexName) => {
    return selectedSources.some(source => source.index === indexName);
  };

  const calculateEstimatedTime = () => {
    const timePerRound = useGraphrag ? 100 : 20;
    return maxRounds * timePerRound;
  };

  return (
    <FormContainer>
      <StyledForm onSubmit={handleSubmit}>
        <SearchContainer>
          <SearchInput
            type="text"
            value={question}
            onChange={(e) => onQuestionChange(e.target.value)}
            placeholder="What would you like to research?"
            required
          />
          <SearchIcon 
            icon={isResearching ? faSpinner : faSearch}
            spin={isResearching}
          />
        </SearchContainer>

        <DataSourcesGrid>
          {indexes.map(([name, description]) => (
            <DataSourceCard
              key={name}
              selected={isSourceSelected(name)}
              onClick={() => toggleDataSource(name, description)}
              role="button"
              aria-pressed={isSourceSelected(name)}
            >
              <SelectionIndicator selected={isSourceSelected(name)}>
                {isSourceSelected(name) && <FontAwesomeIcon icon={faCheck} />}
              </SelectionIndicator>
              <DataSourceTitle>{name}</DataSourceTitle>
              <DataSourceDescription>{description}</DataSourceDescription>
            </DataSourceCard>
          ))}
        </DataSourcesGrid>

        <SettingsContainer>
          <CheckboxContainer>
            <CheckboxInput
              type="checkbox"
              checked={useGraphrag}
              onChange={(e) => onGraphragToggle(e.target.checked)}
              id="graphrag-mode"
            />
            <CheckboxLabel htmlFor="graphrag-mode">
              Enable GraphRAG (Enhanced Knowledge Graph Search)
            </CheckboxLabel>
          </CheckboxContainer>

          <ResearchDepthContainer>
            <label htmlFor="research-depth">Research Depth</label>
            <input
              id="research-depth"
              type="range"
              min="5"
              max={useGraphrag ? "10" : "30"}
              value={maxRounds}
              onChange={(e) => onMaxRoundsChange(parseInt(e.target.value))}
            />
            <ResearchStats>
              <p>
                <span>Number of rounds:</span>
                <span>{maxRounds}</span>
              </p>
              <p>
                <span>Estimated duration:</span>
                <span>{calculateEstimatedTime()} seconds</span>
              </p>
            </ResearchStats>
          </ResearchDepthContainer>
        </SettingsContainer>
      </StyledForm>
    </FormContainer>
  );
};

ResearchForm.propTypes = {
  question: PropTypes.string.isRequired,
  dataSources: PropTypes.arrayOf(
    PropTypes.shape({
      index: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      isExpanded: PropTypes.bool.isRequired,
      isRestricted: PropTypes.bool.isRequired
    })
  ).isRequired,
  maxRounds: PropTypes.number.isRequired,
  useGraphrag: PropTypes.bool.isRequired,
  isResearching: PropTypes.bool.isRequired,
  indexes: PropTypes.arrayOf(PropTypes.array).isRequired,
  onQuestionChange: PropTypes.func.isRequired,
  onDataSourceChange: PropTypes.func.isRequired,
  onGraphragToggle: PropTypes.func.isRequired,
  onMaxRoundsChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired
};

export default ResearchForm;