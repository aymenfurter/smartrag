document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-form'),
        fileInput = document.getElementById('file-input'),
        uploadStatus = document.getElementById('upload-status'),
        fileList = document.getElementById('file-list'),
        showUploadButton = document.getElementById('show-upload'),
        uploadSection = document.getElementById('upload-section'),
        indexFilesButton = document.getElementById('index-files'),
        indexStatus = document.getElementById('index-status');

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
            const data = await fetchWrapper('/list-files', { method: 'GET', headers: { 'X-MS-CLIENT-PRINCIPAL-NAME': '163e5568-589b-12d3-5454-426614174063' } });
            fileList.innerHTML = '';
            data.files.forEach(file => {
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
                fileList.appendChild(li);
            });
        } catch (error) {
            console.error('Error loading files:', error);
        }
    };

    const uploadFile = async (formData) => {
        try {
            const data = await fetchWrapper('/upload', { method: 'POST', body: formData });
            uploadStatus.textContent = data.message || 'File upload failed';
            if (data.container_name) loadUploadedFiles();
        } catch (error) {
            uploadStatus.textContent = 'File upload failed';
        }
    };

    const indexFiles = async () => {
        try {
            const data = await fetchWrapper('/index-files', { method: 'POST' });
            indexStatus.textContent = data.message || 'Indexing failed';
        } catch (error) {
            indexStatus.textContent = 'Indexing failed';
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

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        uploadStatus.textContent = 'Uploading...';
        await uploadFile(formData);
    });

    indexFilesButton.addEventListener('click', async () => {
        indexStatus.textContent = 'Indexing files...';
        await indexFiles();
    });

    loadUploadedFiles();
});