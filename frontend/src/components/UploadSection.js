import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideIn = keyframes`
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const UploadContainer = styled.div`
  padding: 20px;
  background-color: ${props => props.theme.cardBackground};
  border-radius: 10px;
  margin-bottom: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  animation: ${fadeIn} 0.5s ease-out;
`;

const FileList = styled.ul`
  list-style: none;
  padding: 0;
`;

const FileItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background-color: ${props => props.theme.itemBackground};
  #color: ${props => props.theme.textColor};
  margin-bottom: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  animation: ${slideIn} 0.3s ease-out;
`;

const Button = styled.button`
  background-color: ${props => props.theme.primaryButtonColor};
  color: ${props => props.theme.primaryButtonText};
  border: none;
  padding: 12px 20px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.3s ease;

  &:hover {
    background-color: ${props => props.theme.primaryButtonHover};
    transform: translateY(-2px);
  }

  &:disabled {
    background-color: ${props => props.theme.disabledButtonColor};
    color: ${props => props.theme.disabledButtonText};
    cursor: not-allowed;
    transform: none;
  }
`;

const IndexingButton = styled(Button)`
  background-color: #4CAF50;
  &:hover {
    background-color: #45a049;
  }
`;

const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const LoadingSpinner = styled.div`
  border: 4px solid ${props => props.theme.spinnerColor};
  border-top: 4px solid ${props => props.theme.spinnerTopColor};
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: ${rotate} 1s linear infinite;
  margin-top: 15px;
`;

const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 20px;
`;

const FileInputLabel = styled.label`
  display: inline-block;
  padding: 12px 20px;
  background-color: ${props => props.theme.secondaryButtonColor};
  color: ${props => props.theme.primaryButtonText};
  border: 2px dashed ${props => props.theme.borderColor};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 15px;

  &:hover {
    background-color: ${props => props.theme.secondaryButtonHover};
    border-color: ${props => props.theme.primaryButtonColor};
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const CheckboxContainer = styled.label`
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  cursor: pointer;
`;

const HiddenCheckbox = styled.input.attrs({ type: 'checkbox' })`
  position: absolute;
  opacity: 0;
  cursor: pointer;
`;

const StyledCheckbox = styled.div`
  width: 20px;
  height: 20px;
  background-color: ${props => props.checked ? props.theme.primaryButtonColor : props.theme.checkboxBackground};
  border: 2px solid ${props => props.theme.checkboxBorder};
  border-radius: 4px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;

  ${HiddenCheckbox}:focus + & {
    box-shadow: 0 0 0 3px ${props => props.theme.focusBoxShadow};
  }

  &::after {
    content: '✓';
    color: ${props => props.theme.checkboxCheckedColor};
    display: ${props => props.checked ? 'block' : 'none'};
  }
`;

const CheckboxLabel = styled.span`
  font-size: 14px;
  color: ${props => props.theme.textColor};
`;

const StatusMessage = styled.p`
  margin-top: 15px;
  font-weight: bold;
  color: ${props => props.error ? '#d32f2f' : '#4caf50'};
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 15px;
`;

const Title = styled.h3`
  color: ${props => props.theme.titleColor};
`;

function UploadSection({ indexName, isRestricted, onFilesChange }) {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState('');
  const [isIndexing, setIsIndexing] = useState(false);
  const [isMultimodal, setIsMultimodal] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');

  useEffect(() => {
    if (indexName) {
      fetchFiles();
    }
  }, [indexName, isRestricted]);

  const fetchFiles = async () => {
    if (!indexName) return;
    try {
      const response = await fetch(`/indexes/${indexName}/files?is_restricted=${isRestricted}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setFiles(data.files || []);
      onFilesChange();
    } catch (error) {
      console.error('Error loading files:', error);
      setFiles([]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = e.target.elements.file.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('multimodal', isMultimodal);

    try {
      setStatus('Uploading...');
      const response = await fetch(`/indexes/${indexName}/upload?is_restricted=${isRestricted}`, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setStatus(data.message);
      fetchFiles();
    } catch (error) {
      setStatus('Upload failed: ' + error.message);
      console.error('Error:', error);
    }
  };

  const startIndexing = async () => {
    if (!indexName) return;
    
    try {
      setIsIndexing(true);
      setStatus('Starting indexing...');
      const response = await fetch(`/indexes/${indexName}/index?is_restricted=${isRestricted}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setStatus(data.message);
    } catch (error) {
      setStatus('Indexing failed: ' + error.message);
      console.error('Error:', error);
    } finally {
      setIsIndexing(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFileName(file ? file.name : '');
  };

  return (
    <UploadContainer>
      <FormContainer onSubmit={handleUpload}>
        <FileInputLabel>
          {selectedFileName || 'Choose a file'}
          <HiddenFileInput type="file" name="file" onChange={handleFileChange} />
        </FileInputLabel>
        <CheckboxContainer>
          <HiddenCheckbox
            id="multimodal"
            checked={isMultimodal}
            onChange={(e) => setIsMultimodal(e.target.checked)}
          />
          <StyledCheckbox checked={isMultimodal} />
          <CheckboxLabel htmlFor="multimodal">
            Enable multimodal refinement & table postprocessing 
          </CheckboxLabel>
        </CheckboxContainer>
        <ButtonContainer>
          <Button type="submit">Upload</Button>
          <IndexingButton type="button" onClick={startIndexing} disabled={isIndexing}>
            Start Indexing
          </IndexingButton>
        </ButtonContainer>
      </FormContainer>
      <StatusMessage error={status.includes('failed')}>{status}</StatusMessage>
      {isIndexing && <LoadingSpinner />}
      <FileList>
        {files.map((file, index) => (
          <FileItem key={index}>
            <span>{file}</span>
          </FileItem>
        ))}
      </FileList>
    </UploadContainer>
  );
}

export default UploadSection;