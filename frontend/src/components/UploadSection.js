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
  background-color: #f5f5f5;
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
  background-color: white;
  margin-bottom: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  animation: ${slideIn} 0.3s ease-out;
`;

const Button = styled.button`
  background-color: #0078D7;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.3s ease;

  &:hover {
    background-color: #005a9e;
    transform: translateY(-2px);
  }

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
    transform: none;
  }
`;

const IndexingButton = styled(Button)`
  background-color: #4CAF50;
`;

const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const LoadingSpinner = styled.div`
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
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

const FileInput = styled.input`
  margin-bottom: 15px;
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 15px;
`;

const Checkbox = styled.input`
  margin-right: 10px;
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

function UploadSection({ indexName, isRestricted, onFilesChange }) {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState('');
  const [isIndexing, setIsIndexing] = useState(false);
  const [isMultimodal, setIsMultimodal] = useState(false);

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

  return (
    <UploadContainer>
      <h3>Upload Files to {indexName}</h3>
      <FormContainer onSubmit={handleUpload}>
        <FileInput type="file" name="file" />
        <CheckboxContainer>
          <Checkbox
            type="checkbox"
            id="multimodal"
            checked={isMultimodal}
            onChange={(e) => setIsMultimodal(e.target.checked)}
          />
          <label htmlFor="multimodal">
            Enable multimodal refinement (increases upload duration)
          </label>
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