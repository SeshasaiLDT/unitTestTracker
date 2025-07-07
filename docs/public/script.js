// API Base URL
const API_BASE = '/api';

// Global state
let allFiles = [];
let filteredFiles = [];
let currentEditingFile = null;

// DOM Elements
const elementsCache = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    cacheElements();
    setupEventListeners();
    await loadData();
});

// Cache DOM elements
function cacheElements() {
    elementsCache.totalFiles = document.getElementById('totalFiles');
    elementsCache.completedTests = document.getElementById('completedTests');
    elementsCache.completedDocs = document.getElementById('completedDocs');
    elementsCache.testProgress = document.getElementById('testProgress');
    elementsCache.docProgress = document.getElementById('docProgress');
    elementsCache.testProgressText = document.getElementById('testProgressText');
    elementsCache.docProgressText = document.getElementById('docProgressText');
    elementsCache.lastScan = document.getElementById('lastScan');
    elementsCache.filesGrid = document.getElementById('filesGrid');
    elementsCache.loading = document.getElementById('loading');
    elementsCache.noFiles = document.getElementById('noFiles');
    elementsCache.searchInput = document.getElementById('searchInput');
    elementsCache.showIncomplete = document.getElementById('showIncomplete');
    elementsCache.showCompleted = document.getElementById('showCompleted');
    elementsCache.sortBy = document.getElementById('sortBy');
    elementsCache.fileModal = document.getElementById('fileModal');
    elementsCache.modalTitle = document.getElementById('modalTitle');
    elementsCache.modalPath = document.getElementById('modalPath');
    elementsCache.modalDirectory = document.getElementById('modalDirectory');
    elementsCache.modalTestCompleted = document.getElementById('modalTestCompleted');
    elementsCache.modalDocCompleted = document.getElementById('modalDocCompleted');
    elementsCache.modalNotes = document.getElementById('modalNotes');
    elementsCache.saveChanges = document.getElementById('saveChanges');
    elementsCache.cancelChanges = document.getElementById('cancelChanges');
    elementsCache.closeModal = document.querySelector('.close');
}

// Setup event listeners
function setupEventListeners() {
    elementsCache.searchInput.addEventListener('input', filterFiles);
    elementsCache.showIncomplete.addEventListener('change', filterFiles);
    elementsCache.showCompleted.addEventListener('change', filterFiles);
    elementsCache.sortBy.addEventListener('change', filterFiles);
    elementsCache.saveChanges.addEventListener('click', saveFileChanges);
    elementsCache.cancelChanges.addEventListener('click', closeModal);
    elementsCache.closeModal.addEventListener('click', closeModal);
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === elementsCache.fileModal) {
            closeModal();
        }
    });
}

// Load data from API
async function loadData() {
    try {
        elementsCache.loading.style.display = 'block';
        elementsCache.noFiles.style.display = 'none';
        
        const response = await fetch(`${API_BASE}/files`);
        const data = await response.json();
        
        allFiles = data.files || [];
        updateStatistics(data);
        filterFiles();
        
    } catch (error) {
        console.error('Error loading data:', error);
        showError('Failed to load data');
    } finally {
        elementsCache.loading.style.display = 'none';
    }
}

// Update statistics display
function updateStatistics(data) {
    elementsCache.totalFiles.textContent = data.totalFiles || 0;
    elementsCache.completedTests.textContent = data.completedTests || 0;
    elementsCache.completedDocs.textContent = data.completedDocs || 0;
    
    const testProgress = data.totalFiles > 0 ? (data.completedTests / data.totalFiles * 100) : 0;
    const docProgress = data.totalFiles > 0 ? (data.completedDocs / data.totalFiles * 100) : 0;
    
    elementsCache.testProgress.style.width = `${testProgress}%`;
    elementsCache.docProgress.style.width = `${docProgress}%`;
    elementsCache.testProgressText.textContent = `${testProgress.toFixed(1)}%`;
    elementsCache.docProgressText.textContent = `${docProgress.toFixed(1)}%`;
    
    if (data.lastScan) {
        const scanDate = new Date(data.lastScan);
        elementsCache.lastScan.textContent = `Last scan: ${scanDate.toLocaleString()}`;
    }
}

// Filter and sort files
function filterFiles() {
    const searchTerm = elementsCache.searchInput.value.toLowerCase();
    const showIncomplete = elementsCache.showIncomplete.checked;
    const showCompleted = elementsCache.showCompleted.checked;
    const sortBy = elementsCache.sortBy.value;
    
    filteredFiles = allFiles.filter(file => {
        const matchesSearch = file.name.toLowerCase().includes(searchTerm) || 
                             file.relativePath.toLowerCase().includes(searchTerm);
        
        const isComplete = file.testCompleted && file.docCompleted;
        const showFile = (showIncomplete && !isComplete) || (showCompleted && isComplete);
        
        return matchesSearch && showFile;
    });
    
    // Sort files
    filteredFiles.sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'path':
                return a.relativePath.localeCompare(b.relativePath);
            case 'status':
                const aComplete = (a.testCompleted ? 1 : 0) + (a.docCompleted ? 1 : 0);
                const bComplete = (b.testCompleted ? 1 : 0) + (b.docCompleted ? 1 : 0);
                return bComplete - aComplete;
            default:
                return 0;
        }
    });
    
    renderFiles();
}

// Render files in the grid
function renderFiles() {
    if (filteredFiles.length === 0) {
        elementsCache.filesGrid.innerHTML = '<div class="no-results">No files match your criteria</div>';
        return;
    }
    
    const html = filteredFiles.map(file => `
        <div class="file-item" data-file-id="${file.id}">
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-path">${file.relativePath}</div>
                ${file.notes ? `<div class="file-notes">${file.notes}</div>` : ''}
            </div>
            <div class="file-status">
                <span class="status-badge ${file.testCompleted ? 'completed' : 'pending'}">
                    ${file.testCompleted ? '✅ Test' : '⏳ Test'}
                </span>
                <span class="status-badge ${file.docCompleted ? 'completed' : 'pending'}">
                    ${file.docCompleted ? '✅ Doc' : '⏳ Doc'}
                </span>
                <button class="edit-btn" onclick="openFileModal('${file.id}')">Edit</button>
            </div>
        </div>
    `).join('');
    
    elementsCache.filesGrid.innerHTML = html;
}

// Open file modal for editing
function openFileModal(fileId) {
    const file = allFiles.find(f => f.id === fileId);
    if (!file) return;
    
    currentEditingFile = file;
    
    elementsCache.modalTitle.textContent = file.name;
    elementsCache.modalPath.textContent = file.relativePath;
    elementsCache.modalDirectory.textContent = file.directory;
    elementsCache.modalTestCompleted.checked = file.testCompleted;
    elementsCache.modalDocCompleted.checked = file.docCompleted;
    elementsCache.modalNotes.value = file.notes || '';
    
    // Show auto-detection indicators
    const testAutoDetected = document.getElementById('testAutoDetected');
    const docAutoDetected = document.getElementById('docAutoDetected');
    
    if (file.autoDetectedTest) {
        testAutoDetected.style.display = 'block';
        testAutoDetected.textContent = `(Auto-detected: ${file.testFile})`;
    } else {
        testAutoDetected.style.display = 'none';
    }
    
    if (file.autoDetectedDoc) {
        docAutoDetected.style.display = 'block';
        docAutoDetected.textContent = `(Auto-detected: ${file.docFile})`;
    } else {
        docAutoDetected.style.display = 'none';
    }
    
    elementsCache.fileModal.style.display = 'block';
}

// Close modal
function closeModal() {
    elementsCache.fileModal.style.display = 'none';
    currentEditingFile = null;
}

// Save file changes
async function saveFileChanges() {
    if (!currentEditingFile) return;
    
    const updatedFile = {
        testCompleted: elementsCache.modalTestCompleted.checked,
        docCompleted: elementsCache.modalDocCompleted.checked,
        notes: elementsCache.modalNotes.value
    };
    
    try {
        elementsCache.saveChanges.disabled = true;
        elementsCache.saveChanges.textContent = 'Saving...';
        
        const response = await fetch(`${API_BASE}/files/${currentEditingFile.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedFile)
        });
        
        if (response.ok) {
            await loadData(); // Refresh data
            closeModal();
            showSuccess('File updated successfully');
        } else {
            throw new Error('Failed to update file');
        }
        
    } catch (error) {
        console.error('Error saving changes:', error);
        showError('Failed to save changes');
    } finally {
        elementsCache.saveChanges.disabled = false;
        elementsCache.saveChanges.textContent = 'Save Changes';
    }
}

// Show success message
function showSuccess(message) {
    // Create a temporary success message
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 1001;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// Show error message
function showError(message) {
    // Create a temporary error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f44336;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 1001;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Auto-refresh data every 30 seconds
setInterval(async () => {
    await loadData();
}, 30000);
