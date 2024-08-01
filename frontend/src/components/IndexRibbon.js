import React, { useState, useContext, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';
import { ConfigContext } from './ConfigContext';

// Basic Tier of Ai Search has 15 indexes (2 indexes on AI Search per index in SmartRAG)
const MAX_INDEXES = 7;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideIn = keyframes`
  from { transform: translateX(-20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

const RibbonContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 10px;
  background-color: ${props => props.theme.sidebarBackground};
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  animation: ${fadeIn} 0.5s ease-out;
`;

const IndexList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
`;

const IndexItem = styled.div`
  padding: 12px 15px;
  background-color: ${props => props.selected ? props.theme.selectedItemBackground : props.theme.itemBackground};
  color: ${props => props.selected ? props.theme.selectedItemText : props.theme.itemText};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  animation: ${slideIn} 0.3s ease-out;
  animation-delay: ${props => props.index * 0.05}s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
`;

const DeleteButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.selected ? props.theme.selectedItemText : props.theme.deleteButtonColor};
  cursor: pointer;
  padding: 5px;
  transition: color 0.3s ease;

  &:hover {
    color: ${props => props.theme.deleteButtonHoverColor};
  }
`;

const CreateIndexForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Input = styled.input`
  padding: 10px;
  border: 1px solid ${props => props.theme.inputBorder};
  border-radius: 5px;
  font-size: 14px;
  background-color: ${props => props.theme.inputBackground};
  color: ${props => props.theme.inputText};
  transition: border-color 0.3s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.focusBorderColor};
  }
`;

const Button = styled.button`
  background-color: ${props => props.theme.primaryButtonColor};
  color: ${props => props.theme.primaryButtonText};
  border: none;
  padding: 12px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: ${props => props.theme.primaryButtonHover};
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background-color: ${props => props.theme.disabledButtonColor};
    cursor: not-allowed;
    transform: none;
  }
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
`;

const StyledCheckbox = styled.input`
  appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid ${props => props.theme.checkboxBorder};
  border-radius: 3px;
  margin-right: 10px;
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
  background-color: ${props => props.theme.checkboxBackground};

  &:checked {
    background-color: ${props => props.theme.checkboxCheckedBackground};
  }

  &:checked::after {
    content: '✓';
    position: absolute;
    color: ${props => props.theme.checkboxCheckedColor};
    font-size: 16px;
    top: -2px;
    left: 3px;
  }

  &:hover {
    box-shadow: 0 0 5px ${props => props.theme.checkboxHoverShadow};
  }
`;

const CheckboxLabel = styled.label`
  cursor: pointer;
  user-select: none;
  color: ${props => props.theme.labelText};
`;

const ErrorMessage = styled.div`
  color: ${props => props.theme.errorText};
  font-size: 14px;
  margin-top: 10px;
`;

function IndexRibbon({ indexes, selectedIndex, onSelectIndex, onIndexesChange, onDeleteIndex }) {
  const [newIndexName, setNewIndexName] = useState('');
  const [isRestricted, setIsRestricted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { operationsRestricted, easyAuthEnabled } = useContext(ConfigContext);

  useEffect(() => {
    if (indexes.length >= MAX_INDEXES) {
      setErrorMessage(`Maximum number of indexes (${MAX_INDEXES}) reached.`);
    } else {
      setErrorMessage('');
    }
  }, [indexes]);

  const handleCreateIndex = async (e) => {
    e.preventDefault();
    if (!newIndexName) return;
    if (indexes.length >= MAX_INDEXES) {
      setErrorMessage(`Maximum number of indexes (${MAX_INDEXES}) reached.`);
      return;
    }
    try {
      const response = await fetch('/indexes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newIndexName, is_restricted: isRestricted })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log(data.message);
      setNewIndexName('');
      onIndexesChange();
      setErrorMessage('');
    } catch (error) {
      console.error('Error creating index:', error);
      setErrorMessage('Failed to create index. Please try again.');
    }
  };

  const handleDeleteIndex = async (indexName, isRestricted) => {
    if (window.confirm(`Are you sure you want to delete the index "${indexName}"?`)) {
      try {
        const response = await fetch(`/indexes/${indexName}?is_restricted=${isRestricted}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log(data.message);
        onDeleteIndex(indexName, isRestricted);
      } catch (error) {
        console.error('Error deleting index:', error);
        alert('Failed to delete index. Some components may have been removed.');
      }
    }
  };

  return (
    <RibbonContainer>
      <IndexList>
        {indexes.map((index, i) => (
          <IndexItem
            key={i}
            index={i}
            selected={selectedIndex && selectedIndex[0] === index[0] && selectedIndex[1] === index[1]}
            onClick={() => onSelectIndex(index)}
          >
            <span>{index[0]} {index[1] ? '(hidden)' : ''}</span>
            {!operationsRestricted && (
              <DeleteButton
                selected={selectedIndex && selectedIndex[0] === index[0] && selectedIndex[1] === index[1]}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteIndex(index[0], index[1]);
                }}
              >
                <FontAwesomeIcon icon={faTrash} />
              </DeleteButton>
            )}
          </IndexItem>
        ))}
      </IndexList>
      {!operationsRestricted && (
        <CreateIndexForm onSubmit={handleCreateIndex}>
          <Input
            type="text"
            value={newIndexName}
            onChange={(e) => setNewIndexName(e.target.value.toLowerCase())}
            placeholder="index name"
            maxLength="8"
          />
          {easyAuthEnabled && (
            <CheckboxContainer>
              <StyledCheckbox
                type="checkbox"
                id="restrictedCheckbox"
                checked={isRestricted}
                onChange={(e) => setIsRestricted(e.target.checked)}
              />
              <CheckboxLabel htmlFor="restrictedCheckbox">Restricted</CheckboxLabel>
            </CheckboxContainer>
          )}
          <Button type="submit" disabled={indexes.length >= MAX_INDEXES}>
            <FontAwesomeIcon icon={faPlus} style={{ marginRight: '5px' }} />
            Create Index
          </Button>
          {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
        </CreateIndexForm>
      )}
    </RibbonContainer>
  );
}

export default IndexRibbon;