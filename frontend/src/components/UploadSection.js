import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

const UploadContainer = styled.div`
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
  margin-bottom: 20px;
`;

const FileList = styled.ul`
  list-style: none;
  padding: 0;
`;

const FileItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: #f1f1f1;
  margin-bottom: 5px;
  border-radius: 4px;
`;

const Button = styled.button`
  background-color: #0078D7;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
`;

const IndexingButton = styled(Button)`
  background-color: #4CAF50;
  margin-left: 10px;
`;

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const LoadingSpinner = styled.div`
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: ${rotate} 1s linear infinite;
  margin-top: 10px;
`;

function UploadSection({ indexName, isRestricted, onFilesChange }) {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState('');
  const [isIndexing, setIsIndexing] = useState(false);

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
      <form onSubmit={handleUpload}>
        <input type="file" name="file" />
        <Button type="submit">Upload</Button>
        <IndexingButton type="button" onClick={startIndexing} disabled={isIndexing}>
          Start Indexing
        </IndexingButton>
      </form>
      <p>{status}</p>
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