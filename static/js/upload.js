document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-form'),
        fileInput = document.getElementById('file-input'),
        uploadStatus = document.getElementById('upload-status'),
        fileList = document.getElementById('file-list'),
        showUploadButton = document.getElementById('show-upload'),
        uploadSection = document.getElementById('upload-section'),
        indexFilesButton = document.getElementById('index-files'),
        indexStatus = document.getElementById('index-status'),
        researchTab = document.querySelector('nav ul li:nth-child(3)'),
        researchSection = document.getElementById('research-section'),
        folder1UploadForm = document.getElementById('folder1-upload-form'),
        folder1FileInput = document.getElementById('folder1-file-input'),
        folder1UploadStatus = document.getElementById('folder1-upload-status'),
        folder1FileList = document.getElementById('folder1-file-list'),
        folder1IndexFilesButton = document.getElementById('folder1-index-files'),
        folder1IndexStatus = document.getElementById('folder1-index-status'),
        folder2UploadForm = document.getElementById('folder2-upload-form'),
        folder2FileInput = document.getElementById('folder2-file-input'),
        folder2UploadStatus = document.getElementById('folder2-upload-status'),
        folder2FileList = document.getElementById('folder2-file-list'),
        folder2IndexFilesButton = document.getElementById('folder2-index-files'),
        folder2IndexStatus = document.getElementById('folder2-index-status');

    const fetchWrapper = async (url, options) => {
        try {
            const response = await fetch(url, options);
            return await response.json();
        } catch (error) {
            console.error('Error:', error);
            throw new Error('Network response was not ok.');
        }
    };

    const loadUploadedFiles = async () => {
        try {
            const data = await fetchWrapper('/list-files', { method: 'GET' });
            [fileList, folder1FileList, folder2FileList].forEach(list => list.innerHTML = '');
    
            const updateFileList = (files, list) => {
                files.forEach(file => {
                    const li = document.createElement('li'),
                        span = document.createElement('span'),
                        removeButton = document.createElement('button');
                    span.textContent = file;
                    removeButton.textContent = 'Remove';
                    removeButton.addEventListener('click', async () => {
                        await deleteFile(file);
                        loadUploadedFiles();
                    });
                    li.appendChild(span);
                    li.appendChild(removeButton);
                    list.appendChild(li);
                });
            };
    
            updateFileList(data.files.default, fileList);
            updateFileList(data.files.folder1, folder1FileList);
            updateFileList(data.files.folder2, folder2FileList);
        } catch (error) {
            console.error('Error loading files:', error);
        }
    };

    const uploadFile = async (formData, url, statusElement) => {
        try {
            const data = await fetchWrapper(url, { method: 'POST', body: formData });
            statusElement.textContent = data.message || 'File upload failed';
            if (data.container_name) loadUploadedFiles();
        } catch (error) {
            statusElement.textContent = 'File upload failed';
        }
    };

    const indexFiles = async (url, statusElement) => {
        try {
            const data = await fetchWrapper(url, { method: 'POST' });
            statusElement.textContent = data.message || 'Indexing failed';
        } catch (error) {
            statusElement.textContent = 'Indexing failed';
        }
    };

    const deleteFile = async (filename) => {
        try {
            const data = await fetchWrapper(`/delete-file/${encodeURIComponent(filename)}`, { method: 'DELETE' });
            displayMessage(indexStatus, data.message || 'Failed to delete file', data.message ? 'success' : 'error');
        } catch (error) {
            displayMessage(indexStatus, 'Error deleting file', 'error');
        }
    };

    const displayMessage = (element, message, type) => {
        element.textContent = message;
        element.className = type;
        setTimeout(() => {
            element.textContent = '';
            element.className = '';
        }, 3000);
    };

    showUploadButton.addEventListener('click', () => {
        uploadSection.classList.toggle('hidden');
    });

    researchTab.addEventListener('click', () => {
        document.querySelector('nav ul li.active').classList.remove('active');
        researchTab.classList.add('active');
        uploadSection.classList.add('hidden');
        researchSection.classList.remove('hidden');
    });

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        uploadStatus.textContent = 'Uploading...';
        await uploadFile(formData, '/upload', uploadStatus);
    });

    folder1UploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('file', folder1FileInput.files[0]);
        folder1UploadStatus.textContent = 'Uploading...';
        await uploadFile(formData, '/folder1-upload', folder1UploadStatus);
    });

    folder2UploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('file', folder2FileInput.files[0]);
        folder2UploadStatus.textContent = 'Uploading...';
        await uploadFile(formData, '/folder2-upload', folder2UploadStatus);
    });

    indexFilesButton.addEventListener('click', async () => {
        indexStatus.textContent = 'Indexing files...';
        await indexFiles('/index-files', indexStatus);
    });

    folder1IndexFilesButton.addEventListener('click', async () => {
        folder1IndexStatus.textContent = 'Indexing files...';
        await indexFiles('/folder1-index-files', folder1IndexStatus);
    });

    folder2IndexFilesButton.addEventListener('click', async () => {
        folder2IndexStatus.textContent = 'Indexing files...';
        await indexFiles('/folder2-index-files', folder2IndexStatus);
    });

    loadUploadedFiles();
});