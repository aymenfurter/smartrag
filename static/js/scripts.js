document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
    const uploadStatus = document.getElementById('upload-status');
    const fileList = document.getElementById('file-list');
    const chatForm = document.getElementById('chat-form');
    const userMessage = document.getElementById('user-message');
    const chatContainer = document.getElementById('chat-container');
    const showUploadButton = document.getElementById('show-upload');
    const uploadSection = document.getElementById('upload-section');
    let buffer = '';
    let isProcessing = false;
    let messageElement = null;

    loadUploadedFiles();

    showUploadButton.addEventListener('click', () => {
        uploadSection.classList.toggle('hidden');
    });

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        uploadStatus.textContent = 'Uploading...';

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            uploadStatus.textContent = data.message || 'File upload failed';
            if (data.container_name) {
                saveUploadedFile(fileInput.files[0].name);
                loadUploadedFiles();
            }
        } catch (error) {
            console.error('Error:', error);
            uploadStatus.textContent = 'File upload failed';
        }
    });

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const messageContent = userMessage.value.trim();
        if (!messageContent) return;

        appendMessage('user', messageContent);
        userMessage.value = '';

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-MS-CLIENT-PRINCIPAL-NAME': '163e5568-589b-12d3-5454-426614174063'
                },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: messageContent }],
                    context: {},
                    session_state: null
                })
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            messageElement = document.createElement('div');
            messageElement.className = 'message assistant';
            chatContainer.appendChild(messageElement);
            readStream(reader, decoder);
        } catch (error) {
            console.error('Error:', error);
        }
    });

    function appendMessage(role, content) {
        const message = document.createElement('div');
        message.className = `message ${role}`;
        message.innerHTML = content.split('').map(char => `<span>${char === ' ' ? '&nbsp;' : char}</span>`).join('');
        chatContainer.appendChild(message);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    async function readStream(reader, decoder) {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = decoder.decode(value, { stream: true });
            const lines = text.split('\n');
            for (let line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.substring(6);
                    if (data === '[DONE]') {
                        if (buffer) processBuffer(messageElement);
                    } else {
                        try {
                            const json = JSON.parse(data);
                            if (json.choices && json.choices[0].delta.content) {
                                buffer += json.choices[0].delta.content;
                                buffer = buffer.replace(/\n/g, '<br>').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
                                if (!isProcessing) processBuffer(messageElement);
                            }
                        } catch (e) {
                            console.error('Error parsing JSON:', e);
                        }
                    }
                }
            }
        }
    }

    async function processBuffer(messageElement) {
        isProcessing = true;
        while (buffer.length > 0) {
            const char = buffer[0];
            buffer = buffer.substring(1);
            // check if emoji
            if (char === '<') {
                if (buffer.startsWith('br>')) {
                    const br = document.createElement('br');
                    messageElement.appendChild(br);
                    buffer = buffer.substring(3);
                    continue;
                }
            }
            const span = document.createElement('span');
            span.innerHTML = char === ' ' ? '&nbsp;' : char;
            span.style.opacity = '0';
            span.style.animation = 'fadeInChar 0.3s forwards';
            messageElement.appendChild(span);
            chatContainer.scrollTop = chatContainer.scrollHeight;
            await new Promise(resolve => setTimeout(resolve, 3));
        }
        const spans = document.querySelectorAll('.message.assistant span');
        spans.forEach(span => {
            const textNode = document.createTextNode(span.textContent);
            span.replaceWith(textNode);
        });
        isProcessing = false;
    }

    function saveUploadedFile(filename) {
        const files = getUploadedFiles();
        files.push(filename);
        localStorage.setItem('uploadedFiles', JSON.stringify(files));
    }

    function loadUploadedFiles() {
        const files = getUploadedFiles();
        fileList.innerHTML = '';
        files.forEach(file => {
            const li = document.createElement('li');
            const span = document.createElement('span');
            span.textContent = file;
            const removeButton = document.createElement('button');
            removeButton.textContent = 'Remove';
            removeButton.addEventListener('click', () => {
                removeUploadedFile(file);
                loadUploadedFiles();
            });
            li.appendChild(span);
            li.appendChild(removeButton);
            fileList.appendChild(li);
        });
    }

    function getUploadedFiles() {
        return JSON.parse(localStorage.getItem('uploadedFiles')) || [];
    }

    function removeUploadedFile(filename) {
        const files = getUploadedFiles();
        const updatedFiles = files.filter(file => file !== filename);
        localStorage.setItem('uploadedFiles', JSON.stringify(updatedFiles));
    }
});
