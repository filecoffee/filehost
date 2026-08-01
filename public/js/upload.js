document.addEventListener('DOMContentLoaded', function() {
    const dragArea = document.getElementById('dragArea');
    const fileInput = document.getElementById('fileInput');
    const uploadForm = document.getElementById('uploadForm');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const uploadResult = document.getElementById('uploadResult');
    const fileUrl = document.getElementById('fileUrl');
    const browseBtn = document.getElementById('browseBtn');
    const errorMessage = document.getElementById('errorMessage');
    const maxSizeDisplay = document.getElementById('maxSize');

    // Server configuration
    let serverConfig = {
        maxFileSize: 0,
        maxFileSizeMB: 0,
        fileNameLength: 10
    };

    // Fetch server configuration on load
    fetchServerConfig();

    async function fetchServerConfig() {
        try {
            const response = await fetch('/api/config');
            if (response.ok) {
                serverConfig = await response.json();
                maxSizeDisplay.textContent = `${serverConfig.maxFileSizeMB} MB`;
            } else {
                throw new Error('Failed to fetch server configuration');
            }
        } catch (error) {
            showError('Warning: Could not load server configuration. File size validation may be inaccurate.');
            maxSizeDisplay.textContent = 'Unknown';
        }
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        // Scroll to error message
        errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function hideError() {
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';
    }

    function validateFile(file) {
        hideError();

        if (!file) {
            showError('No file selected.');
            return false;
        }

        // Check if server config is loaded
        if (serverConfig.maxFileSize === 0) {
            showError('Server configuration not loaded. Please refresh the page and try again.');
            return false;
        }

        // Validate file size
        if (file.size === 0) {
            showError('The selected file is empty (0 bytes). Please select a valid file.');
            return false;
        }

        if (file.size > serverConfig.maxFileSize) {
            const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
            showError(`File size (${fileSizeMB} MB) exceeds the maximum allowed size of ${serverConfig.maxFileSizeMB} MB.`);
            return false;
        }

        // Validate filename length
        if (!file.name || file.name.length === 0) {
            showError('The file has no name. Please select a valid file.');
            return false;
        }

        // Check for extremely long filenames (common filesystem limit is 255 characters)
        if (file.name.length > serverConfig.fileNameLength) {
            showError(`Filename is too long (${file.name.length} characters). Maximum allowed is ${serverConfig.fileNameLength} characters.`);
            return false;
        }

        // Check for invalid filename characters (basic check)
        const invalidChars = /[<>:"|?*\x00-\x1F]/;
        if (invalidChars.test(file.name)) {
            showError('Filename contains invalid characters. Please rename the file and try again.');
            return false;
        }

        return true;
    }

    // Drag and drop functionality
    dragArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dragArea.classList.add('drag-over');
    });

    dragArea.addEventListener('dragleave', () => {
        dragArea.classList.remove('drag-over');
    });

    dragArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dragArea.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFileSelect();
        }
    });

    // Browse button functionality
    browseBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // Also make the drag area clickable
    dragArea.addEventListener('click', (e) => {
        // Only trigger if not clicking the browse button itself
        if (e.target !== browseBtn) {
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', handleFileSelect);

    function handleFileSelect() {
        const file = fileInput.files[0];

        if (!file) {
            return;
        }

        // Validate file immediately
        if (!validateFile(file)) {
            fileInput.value = ''; // Clear the file input
            fileInfo.style.display = 'none';
            uploadBtn.disabled = true;
            return;
        }

        // File is valid, show info and enable upload
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        fileInfo.style.display = 'block';
        uploadBtn.disabled = false;
        hideError();
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const file = fileInput.files[0];

        // Re-validate file before upload
        if (!validateFile(file)) {
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        const apiKey = document.getElementById('apiKey').value;

        uploadProgress.style.display = 'block';
        uploadResult.style.display = 'none';
        uploadBtn.disabled = true;
        hideError();

        try {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    progressBar.style.width = percentComplete + '%';
                    progressText.textContent = `Uploading... ${Math.round(percentComplete)}%`;
                }
            });

            xhr.addEventListener('load', () => {
                uploadProgress.style.display = 'none';
                uploadBtn.disabled = false;

                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        fileUrl.href = response.url;
                        fileUrl.textContent = response.url;
                        uploadResult.style.display = 'block';

                        // Clear form for next upload
                        fileInput.value = '';
                        fileInfo.style.display = 'none';
                        uploadBtn.disabled = true;
                    } catch (parseError) {
                        showError('Upload may have succeeded, but the response format was unexpected. Please check your uploads.');
                    }
                } else {
                    handleUploadError(xhr);
                }
            });

            xhr.addEventListener('error', () => {
                uploadProgress.style.display = 'none';
                uploadBtn.disabled = false;
                showError('Upload failed: Network error. Please check your internet connection and try again.');
            });

            xhr.addEventListener('timeout', () => {
                uploadProgress.style.display = 'none';
                uploadBtn.disabled = false;
                showError('Upload failed: Request timed out. The file may be too large or your connection too slow.');
            });

            xhr.addEventListener('abort', () => {
                uploadProgress.style.display = 'none';
                uploadBtn.disabled = false;
                showError('Upload was cancelled.');
            });

            xhr.open('POST', '/upload');
            if (apiKey) {
                xhr.setRequestHeader('x-api-key', apiKey);
            }

            // Set timeout to 5 minutes for large files
            xhr.timeout = 300000;

            xhr.send(formData);

        } catch (error) {
            uploadProgress.style.display = 'none';
            uploadBtn.disabled = false;
            showError(`Upload failed: ${error.message || 'An unexpected error occurred. Please try again.'}`);
        }
    });

    function handleUploadError(xhr) {
        let errorMsg = 'Upload failed: ';

        try {
            // Try to parse error response
            const errorResponse = JSON.parse(xhr.responseText);
            if (errorResponse.error) {
                errorMsg += errorResponse.error;
            } else if (errorResponse.message) {
                errorMsg += errorResponse.message;
            } else {
                errorMsg += `Server returned status ${xhr.status}`;
            }
        } catch (parseError) {
            // If we can't parse the response, provide helpful error based on status code
            switch (xhr.status) {
                case 400:
                    errorMsg += 'Invalid request. Please ensure you selected a valid file.';
                    break;
                case 401:
                    errorMsg += 'Authentication failed. Please check your API key.';
                    break;
                case 403:
                    errorMsg += 'Access denied. Public uploads may be disabled or your API key is invalid.';
                    break;
                case 413:
                    errorMsg += `File too large. Maximum size is ${serverConfig.maxFileSizeMB} MB.`;
                    break;
                case 429:
                    errorMsg += 'Too many requests. Please wait a moment and try again.';
                    break;
                case 500:
                    errorMsg += 'Server error. Please try again later or contact the administrator.';
                    break;
                case 503:
                    errorMsg += 'Service temporarily unavailable. Please try again later.';
                    break;
                default:
                    errorMsg += `Unexpected error (${xhr.status}). `;
                    if (xhr.responseText) {
                        errorMsg += xhr.responseText.substring(0, 100);
                    } else {
                        errorMsg += 'Please try again or contact the administrator.';
                    }
            }
        }

        showError(errorMsg);
    }

    // Copy button functionality
    const copyBtn = document.getElementById('copyBtn');
    copyBtn.addEventListener('click', function() {
        navigator.clipboard.writeText(fileUrl.href).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = fileUrl.href;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                const originalText = copyBtn.textContent;
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 2000);
            } catch (err) {
                showError('Failed to copy URL to clipboard. Please copy it manually.');
            }
            document.body.removeChild(textArea);
        });
    });
});
