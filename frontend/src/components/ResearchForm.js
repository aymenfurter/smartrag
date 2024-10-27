import React from 'react';
import PropTypes from 'prop-types'; // Add PropTypes import
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, 
  faMinus, 
  faChevronDown, 
  faChevronUp, 
  faSpinner, 
  faPaperPlane 
} from '@fortawesome/free-solid-svg-icons';

import {
  ResearchForm as StyledForm,
  Input,
  Select,
  Button,
  DataSourceContainer,
  DataSourceHeader,
  IconButton,
  SwitchContainer,
  Checkbox,
  StyledFontAwesomeIcon
} from '../styles/StyledComponents';

// Add PropTypes for DataSourceField component
const DataSourceField = ({ 
  source, 
  index, 
  indexes,
  onDataSourceChange,
  onDataSourceRemove,
  onDataSourceExpand 
}) => (
  <DataSourceContainer>
    <DataSourceHeader>
      <Select
        value={source.index}
        onChange={(e) => onDataSourceChange(index, 'index', e.target.value)}
        required
      >
        <option value="">Select a data source</option>
        {indexes.map((idx) => (
          <option key={idx[0]} value={idx[0]}>
            {idx[0]}
          </option>
        ))}
      </Select>
      <div>
        <IconButton 
          onClick={() => onDataSourceExpand(index)}
          aria-label={source.isExpanded ? "Collapse data source" : "Expand data source"}
        >
          <FontAwesomeIcon icon={source.isExpanded ? faChevronUp : faChevronDown} />
        </IconButton>
        <IconButton 
          onClick={() => onDataSourceRemove(index)}
          aria-label="Remove data source"
        >
          <FontAwesomeIcon icon={faMinus} />
        </IconButton>
      </div>
    </DataSourceHeader>
    {source.isExpanded && (
      <>
        <Input
          type="text"
          value={source.name}
          onChange={(e) => onDataSourceChange(index, 'name', e.target.value)}
          placeholder="Custom name for this data source"
          aria-label="Data source name"
        />
        <Input
          type="text"
          value={source.description}
          onChange={(e) => onDataSourceChange(index, 'description', e.target.value)}
          placeholder="Brief description of this data source"
          aria-label="Data source description"
        />
      </>
    )}
  </DataSourceContainer>
);

// Add PropTypes for DataSourceField
DataSourceField.propTypes = {
  source: PropTypes.shape({
    index: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    isExpanded: PropTypes.bool.isRequired,
    isRestricted: PropTypes.bool.isRequired
  }).isRequired,
  index: PropTypes.number.isRequired,
  indexes: PropTypes.arrayOf(PropTypes.array).isRequired,
  onDataSourceChange: PropTypes.func.isRequired,
  onDataSourceRemove: PropTypes.func.isRequired,
  onDataSourceExpand: PropTypes.func.isRequired
};

const ResearchForm = ({ 
  question,
  dataSources,
  maxRounds,
  useGraphrag,
  isResearching,
  indexes,
  onQuestionChange,
  onDataSourceChange,
  onDataSourceAdd,
  onDataSourceRemove,
  onDataSourceExpand,
  onGraphragToggle,
  onMaxRoundsChange,
  onSubmit 
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
  };

  const calculateEstimatedTime = () => {
    const timePerRound = useGraphrag ? 100 : 20;
    return maxRounds * timePerRound;
  };

  return (
    <StyledForm onSubmit={handleSubmit}>
      {/* Research Question Input */}
      <Input
        type="text"
        value={question}
        onChange={(e) => onQuestionChange(e.target.value)}
        placeholder="What would you like to research?"
        required
        aria-label="Research question"
      />

      {/* Data Sources */}
      {dataSources.map((source, index) => (
        <DataSourceField
          key={`data-source-${index}`}
          source={source}
          index={index}
          indexes={indexes}
          onDataSourceChange={onDataSourceChange}
          onDataSourceRemove={onDataSourceRemove}
          onDataSourceExpand={onDataSourceExpand}
        />
      ))}

      {/* Add Data Source Button */}
      <Button 
        type="button" 
        onClick={onDataSourceAdd}
        aria-label="Add data source"
      >
        <StyledFontAwesomeIcon icon={faPlus} /> Add Data Source
      </Button>

      {/* GraphRAG Toggle */}
      <SwitchContainer>
        <Checkbox
          type="checkbox"
          id="graphrag-mode"
          checked={useGraphrag}
          onChange={(e) => onGraphragToggle(e.target.checked)}
          aria-label="Enable GraphRAG"
        />
        <label htmlFor="graphrag-mode">
          Enable GraphRAG (Enhanced Knowledge Graph Search)
        </label>
      </SwitchContainer>

      {/* Research Depth Slider */}
      <div>
        <label htmlFor="research-depth">
          <p>How detailed should the research be?</p>
        </label>
        <input
          id="research-depth"
          type="range"
          min="5"
          max={useGraphrag ? "10" : "30"}
          value={maxRounds}
          onChange={(e) => onMaxRoundsChange(parseInt(e.target.value))}
          aria-label="Research depth"
        />
        <span>Estimated time: {calculateEstimatedTime()} seconds</span>
      </div>

      {/* Submit Button */}
      <Button 
        type="submit" 
        disabled={isResearching}
        aria-label={isResearching ? "Researching..." : "Start Research"}
      >
        <StyledFontAwesomeIcon 
          icon={isResearching ? faSpinner : faPaperPlane} 
          spin={isResearching} 
        />
        {isResearching ? ' Researching...' : ' Start Research'}
      </Button>
    </StyledForm>
  );
};

// PropTypes for ResearchForm
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
  onDataSourceAdd: PropTypes.func.isRequired,
  onDataSourceRemove: PropTypes.func.isRequired,
  onDataSourceExpand: PropTypes.func.isRequired,
  onGraphragToggle: PropTypes.func.isRequired,
  onMaxRoundsChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired
};

export default ResearchForm;