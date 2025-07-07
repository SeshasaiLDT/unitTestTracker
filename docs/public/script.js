// Java Unit Test Tracker - Client-Side Implementation
// Global state
let allFiles = [];
let filteredFiles = [];
let folderStructure = {};
let currentEditingFile = null;
let selectedFolders = new Set(); // For sidebar filtering

// DOM Elements Cache
const elements = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    setupEventListeners();
    loadFromLocalStorage();
    updateUI();
});

// Cache DOM elements
function cacheElements() {
    elements.folderInput = document.getElementById('folderInput');
    elements.fileInput = document.getElementById('fileInput');
    elements.folderTree = document.getElementById('folderTree');
    elements.fileTreeContainer = document.getElementById('fileTreeContainer');
    elements.uploadSection = document.getElementById('uploadSection');
    elements.statsControls = document.getElementById('statsControls');
    elements.fileExplorer = document.getElementById('fileExplorer');
    elements.welcomeMessage = document.getElementById('welcomeMessage');
    elements.loading = document.getElementById('loading');
    elements.pathBreadcrumb = document.getElementById('pathBreadcrumb');
    
    // Statistics
    elements.totalFiles = document.getElementById('totalFiles');
    elements.completedTests = document.getElementById('completedTests');
    elements.completedDocs = document.getElementById('completedDocs');
    elements.testProgress = document.getElementById('testProgress');
    elements.docProgress = document.getElementById('docProgress');
    
    // Controls
    elements.searchInput = document.getElementById('searchInput');
    elements.showAll = document.getElementById('showAll');
    elements.showIncomplete = document.getElementById('showIncomplete');
    elements.showCompleted = document.getElementById('showCompleted');
    
    // Modal
    elements.fileModal = document.getElementById('fileModal');
    elements.modalTitle = document.getElementById('modalTitle');
    elements.modalFileName = document.getElementById('modalFileName');
    elements.modalPath = document.getElementById('modalPath');
    elements.modalDirectory = document.getElementById('modalDirectory');
    elements.modalTestFile = document.getElementById('modalTestFile');
    elements.modalTestStatus = document.getElementById('modalTestStatus');
    elements.modalDocFile = document.getElementById('modalDocFile');
    elements.modalDocStatus = document.getElementById('modalDocStatus');
    elements.modalTestCompleted = document.getElementById('modalTestCompleted');
    elements.modalDocCompleted = document.getElementById('modalDocCompleted');
    elements.modalNotes = document.getElementById('modalNotes');
    elements.saveChanges = document.getElementById('saveChanges');
    elements.cancelChanges = document.getElementById('cancelChanges');
    elements.closeModal = document.querySelector('.close');
    
    // Data management
    elements.exportData = document.getElementById('exportData');
    elements.importData = document.getElementById('importData');
    elements.clearData = document.getElementById('clearData');
}

// Setup event listeners
function setupEventListeners() {
    // File upload
    elements.folderInput?.addEventListener('change', handleFolderUpload);
    elements.fileInput?.addEventListener('change', handleFileUpload);
    
    // Search and filtering
    elements.searchInput?.addEventListener('input', filterAndRenderFiles);
    elements.showAll?.addEventListener('click', () => setFilter('all'));
    elements.showIncomplete?.addEventListener('click', () => setFilter('incomplete'));
    elements.showCompleted?.addEventListener('click', () => setFilter('completed'));
    
    // Modal
    elements.saveChanges?.addEventListener('click', saveFileChanges);
    elements.cancelChanges?.addEventListener('click', closeModal);
    elements.closeModal?.addEventListener('click', closeModal);
    
    // Data management
    elements.exportData?.addEventListener('click', exportData);
    elements.importData?.addEventListener('change', importData);
    elements.clearData?.addEventListener('click', clearAllData);
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === elements.fileModal) {
            closeModal();
        }
    });
}

// Handle folder upload
async function handleFolderUpload(event) {
    const files = Array.from(event.target.files);
    await processFiles(files);
}

// Handle individual file upload
async function handleFileUpload(event) {
    const files = Array.from(event.target.files);
    await processFiles(files);
}

// Process uploaded files
async function processFiles(fileList) {
    elements.loading.style.display = 'block';
    
    try {
        const javaFiles = fileList.filter(file => file.name.endsWith('.java'));
        const pdfFiles = fileList.filter(file => file.name.endsWith('.pdf'));
        
        if (javaFiles.length === 0) {
            alert('No Java files found in the selected folder.');
            return;
        }
        
        // Create file objects
        const processedFiles = javaFiles.map(file => {
            const filePath = file.webkitRelativePath || file.name;
            const pathParts = filePath.split('/');
            const fileName = pathParts[pathParts.length - 1];
            const directory = pathParts.slice(0, -1).join('/') || 'root';
            
            // Auto-detect test and doc files
            const baseFileName = fileName.replace('.java', '');
            const testFileName = `${baseFileName}_tests.java`;
            const docFileName = `${baseFileName}.pdf`;
            
            const testFile = fileList.find(f => f.name === testFileName || f.webkitRelativePath?.endsWith(testFileName));
            const docFile = fileList.find(f => f.name === docFileName || f.webkitRelativePath?.endsWith(docFileName));
            
            return {
                id: generateId(),
                name: fileName,
                relativePath: filePath,
                directory: directory,
                testCompleted: !!testFile,
                docCompleted: !!docFile,
                autoDetectedTest: !!testFile,
                autoDetectedDoc: !!docFile,
                testFile: testFile ? testFile.name : null,
                docFile: docFile ? docFile.name : null,
                notes: '',
                lastModified: new Date().toISOString()
            };
        });
        
        // Merge with existing files (avoid duplicates)
        const existingPaths = new Set(allFiles.map(f => f.relativePath));
        const newFiles = processedFiles.filter(f => !existingPaths.has(f.relativePath));
        
        allFiles = [...allFiles, ...newFiles];
        
        // Save to localStorage
        saveToLocalStorage();
        
        // Update UI
        buildFolderStructure();
        updateStatistics();
        updateUI();
        filterAndRenderFiles();
        
        showSuccess(`Successfully processed ${newFiles.length} new Java files!`);
        
    } catch (error) {
        console.error('Error processing files:', error);
        showError('Error processing files: ' + error.message);
    } finally {
        elements.loading.style.display = 'none';
    }
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Build folder structure for navigation
function buildFolderStructure() {
    folderStructure = {};
    
    allFiles.forEach(file => {
        const pathParts = file.directory.split('/').filter(part => part);
        let currentLevel = folderStructure;
        
        pathParts.forEach(part => {
            if (!currentLevel[part]) {
                currentLevel[part] = { files: [], subfolders: {} };
            }
            currentLevel = currentLevel[part].subfolders;
        });
        
        // Add file to the appropriate folder
        const targetFolder = pathParts.reduce((level, part) => level[part].subfolders, folderStructure);
        if (!folderStructure[pathParts[pathParts.length - 1]]) {
            folderStructure[pathParts[pathParts.length - 1]] = { files: [], subfolders: {} };
        }
        const finalFolder = pathParts.length > 0 ? 
            pathParts.reduce((level, part) => level[part], folderStructure) :
            folderStructure;
            
        if (!finalFolder.files) finalFolder.files = [];
        finalFolder.files.push(file);
    });
    
    renderFolderTree();
}

// Render folder tree in sidebar
function renderFolderTree() {
    if (!elements.folderTree) return;
    
    const html = renderFolderLevel(folderStructure, '');
    elements.folderTree.innerHTML = html;
}

// Render a level of the folder tree
function renderFolderLevel(structure, path) {
    let html = '';
    
    Object.keys(structure).sort().forEach(folderName => {
        const folder = structure[folderName];
        const fullPath = path ? `${path}/${folderName}` : folderName;
        const isSelected = selectedFolders.has(fullPath);
        const hasSubfolders = Object.keys(folder.subfolders).length > 0;
        const fileCount = folder.files ? folder.files.length : 0;
        
        html += `
            <div class="tree-item">
                <div class="tree-folder ${isSelected ? 'active' : ''}" onclick="toggleFolder('${fullPath}')">
                    <input type="checkbox" class="tree-checkbox" ${isSelected ? 'checked' : ''} 
                           onchange="toggleFolderSelection('${fullPath}', this.checked)" onclick="event.stopPropagation()">
                    <span class="tree-icon">${hasSubfolders ? '📁' : '📂'}</span>
                    <span class="folder-name">${folderName}</span>
                    <span class="file-count">(${fileCount})</span>
                </div>
        `;
        
        if (hasSubfolders) {
            html += `
                <div class="tree-children" id="children-${fullPath.replace(/[^a-zA-Z0-9]/g, '-')}">
                    ${renderFolderLevel(folder.subfolders, fullPath)}
                </div>
            `;
        }
        
        html += '</div>';
    });
    
    return html;
}

// Toggle folder expansion
function toggleFolder(path) {
    const sanitizedPath = path.replace(/[^a-zA-Z0-9]/g, '-');
    const childrenElement = document.getElementById(`children-${sanitizedPath}`);
    if (childrenElement) {
        childrenElement.classList.toggle('expanded');
    }
}

// Toggle folder selection for filtering
function toggleFolderSelection(path, checked) {
    if (checked) {
        selectedFolders.add(path);
    } else {
        selectedFolders.delete(path);
    }
    filterAndRenderFiles();
}

// Set filter type
function setFilter(filterType) {
    // Update button states
    document.querySelectorAll('.view-toggle').forEach(btn => btn.classList.remove('active'));
    document.getElementById('show' + filterType.charAt(0).toUpperCase() + filterType.slice(1))?.classList.add('active');
    
    filterAndRenderFiles();
}

// Filter and render files
function filterAndRenderFiles() {
    const searchTerm = elements.searchInput?.value.toLowerCase() || '';
    const activeFilter = document.querySelector('.view-toggle.active')?.dataset.filter || 'all';
    
    filteredFiles = allFiles.filter(file => {
        // Search filter
        const matchesSearch = !searchTerm || 
            file.name.toLowerCase().includes(searchTerm) || 
            file.relativePath.toLowerCase().includes(searchTerm);
        
        // Completion filter
        const isComplete = file.testCompleted && file.docCompleted;
        let matchesFilter = true;
        
        switch (activeFilter) {
            case 'incomplete':
                matchesFilter = !isComplete;
                break;
            case 'completed':
                matchesFilter = isComplete;
                break;
            case 'all':
            default:
                matchesFilter = true;
                break;
        }
        
        // Folder filter (if any folders are selected)
        let matchesFolder = selectedFolders.size === 0; // Show all if no folders selected
        if (selectedFolders.size > 0) {
            selectedFolders.forEach(folderPath => {
                if (file.directory.startsWith(folderPath) || file.directory === folderPath) {
                    matchesFolder = true;
                }
            });
        }
        
        return matchesSearch && matchesFilter && matchesFolder;
    });
    
    renderFileTree();
}

// Render file tree in main content
function renderFileTree() {
    if (!elements.fileTreeContainer) return;
    
    if (filteredFiles.length === 0) {
        elements.fileTreeContainer.innerHTML = `
            <div class="no-results">
                <h3>No files found</h3>
                <p>Try adjusting your search criteria or folder selection.</p>
            </div>
        `;
        return;
    }
    
    // Group files by directory
    const groupedFiles = {};
    filteredFiles.forEach(file => {
        if (!groupedFiles[file.directory]) {
            groupedFiles[file.directory] = [];
        }
        groupedFiles[file.directory].push(file);
    });
    
    let html = '';
    Object.keys(groupedFiles).sort().forEach(directory => {
        const files = groupedFiles[directory];
        html += `
            <div class="directory-group">
                <div class="directory-header" onclick="toggleDirectory('${directory}')">
                    <span class="directory-icon">📁</span>
                    <span class="directory-name">${directory || 'Root'}</span>
                    <span class="file-count">(${files.length} files)</span>
                    <span class="expand-icon">▼</span>
                </div>
                <div class="directory-files expanded" id="dir-${directory.replace(/[^a-zA-Z0-9]/g, '-')}">
                    ${files.map(file => renderFileItem(file)).join('')}
                </div>
            </div>
        `;
    });
    
    elements.fileTreeContainer.innerHTML = html;
}

// Render individual file item
function renderFileItem(file) {
    const completionPercentage = ((file.testCompleted ? 50 : 0) + (file.docCompleted ? 50 : 0));
    
    return `
        <div class="file-item" onclick="openFileModal('${file.id}')">
            <div class="file-icon">☕</div>
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-details">
                    <span class="test-status ${file.testCompleted ? 'completed' : 'pending'}">
                        ${file.testCompleted ? '✅' : '⏳'} Test
                        ${file.autoDetectedTest ? '(auto)' : '(manual)'}
                    </span>
                    <span class="doc-status ${file.docCompleted ? 'completed' : 'pending'}">
                        ${file.docCompleted ? '✅' : '⏳'} Doc
                        ${file.autoDetectedDoc ? '(auto)' : '(manual)'}
                    </span>
                </div>
                ${file.notes ? `<div class="file-notes">${file.notes}</div>` : ''}
            </div>
            <div class="completion-indicator">
                <div class="completion-bar">
                    <div class="completion-fill" style="width: ${completionPercentage}%"></div>
                </div>
                <div class="completion-text">${completionPercentage}%</div>
            </div>
        </div>
    `;
}

// Toggle directory expansion
function toggleDirectory(directory) {
    const sanitizedDir = directory.replace(/[^a-zA-Z0-9]/g, '-');
    const dirElement = document.getElementById(`dir-${sanitizedDir}`);
    if (dirElement) {
        dirElement.classList.toggle('expanded');
        
        // Update expand icon
        const header = dirElement.previousElementSibling;
        const icon = header.querySelector('.expand-icon');
        icon.textContent = dirElement.classList.contains('expanded') ? '▼' : '▶';
    }
}

// Open file modal
function openFileModal(fileId) {
    const file = allFiles.find(f => f.id === fileId);
    if (!file) return;
    
    currentEditingFile = file;
    
    // Populate modal fields
    elements.modalTitle.textContent = `File Details: ${file.name}`;
    elements.modalFileName.textContent = file.name;
    elements.modalPath.textContent = file.relativePath;
    elements.modalDirectory.textContent = file.directory || 'Root';
    
    // Auto-detection results
    elements.modalTestFile.textContent = file.testFile || 'Not found';
    elements.modalTestStatus.textContent = file.autoDetectedTest ? '✅ Found' : '❌ Not found';
    elements.modalTestStatus.className = `detection-status ${file.autoDetectedTest ? 'found' : 'not-found'}`;
    
    elements.modalDocFile.textContent = file.docFile || 'Not found';
    elements.modalDocStatus.textContent = file.autoDetectedDoc ? '✅ Found' : '❌ Not found';
    elements.modalDocStatus.className = `detection-status ${file.autoDetectedDoc ? 'found' : 'not-found'}`;
    
    // Manual status
    elements.modalTestCompleted.checked = file.testCompleted;
    elements.modalDocCompleted.checked = file.docCompleted;
    elements.modalNotes.value = file.notes || '';
    
    elements.fileModal.style.display = 'block';
}

// Close modal
function closeModal() {
    elements.fileModal.style.display = 'none';
    currentEditingFile = null;
}

// Save file changes
function saveFileChanges() {
    if (!currentEditingFile) return;
    
    // Update file object
    currentEditingFile.testCompleted = elements.modalTestCompleted.checked;
    currentEditingFile.docCompleted = elements.modalDocCompleted.checked;
    currentEditingFile.notes = elements.modalNotes.value;
    currentEditingFile.lastModified = new Date().toISOString();
    
    // Save to localStorage
    saveToLocalStorage();
    
    // Update UI
    updateStatistics();
    filterAndRenderFiles();
    closeModal();
    
    showSuccess('File updated successfully!');
}

// Update statistics
function updateStatistics() {
    const totalFiles = allFiles.length;
    const completedTests = allFiles.filter(f => f.testCompleted).length;
    const completedDocs = allFiles.filter(f => f.docCompleted).length;
    
    elements.totalFiles.textContent = totalFiles;
    elements.completedTests.textContent = completedTests;
    elements.completedDocs.textContent = completedDocs;
    
    const testProgress = totalFiles > 0 ? (completedTests / totalFiles * 100) : 0;
    const docProgress = totalFiles > 0 ? (completedDocs / totalFiles * 100) : 0;
    
    elements.testProgress.style.width = `${testProgress}%`;
    elements.docProgress.style.width = `${docProgress}%`;
}

// Update UI visibility
function updateUI() {
    const hasFiles = allFiles.length > 0;
    
    if (elements.uploadSection) {
        elements.uploadSection.style.display = hasFiles ? 'none' : 'block';
    }
    if (elements.statsControls) {
        elements.statsControls.style.display = hasFiles ? 'block' : 'none';
    }
    if (elements.fileExplorer) {
        elements.fileExplorer.style.display = hasFiles ? 'block' : 'none';
    }
    if (elements.welcomeMessage) {
        elements.welcomeMessage.style.display = hasFiles ? 'none' : 'block';
    }
    
    if (hasFiles) {
        elements.uploadSection?.classList.add('has-files');
    }
}

// Local storage functions
function saveToLocalStorage() {
    try {
        localStorage.setItem('javaTestTracker', JSON.stringify({
            files: allFiles,
            lastSaved: new Date().toISOString()
        }));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        showError('Failed to save data locally');
    }
}

function loadFromLocalStorage() {
    try {
        const data = localStorage.getItem('javaTestTracker');
        if (data) {
            const parsed = JSON.parse(data);
            allFiles = parsed.files || [];
            buildFolderStructure();
            updateStatistics();
        }
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        allFiles = [];
    }
}

// Data management functions
function exportData() {
    const data = {
        files: allFiles,
        exportDate: new Date().toISOString(),
        version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `java-test-tracker-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess('Data exported successfully!');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            if (data.files && Array.isArray(data.files)) {
                allFiles = data.files;
                saveToLocalStorage();
                buildFolderStructure();
                updateStatistics();
                updateUI();
                filterAndRenderFiles();
                showSuccess(`Imported ${allFiles.length} files successfully!`);
            } else {
                throw new Error('Invalid file format');
            }
        } catch (error) {
            console.error('Error importing data:', error);
            showError('Failed to import data: Invalid file format');
        }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
}

function clearAllData() {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
        allFiles = [];
        folderStructure = {};
        selectedFolders.clear();
        
        localStorage.removeItem('javaTestTracker');
        
        buildFolderStructure();
        updateStatistics();
        updateUI();
        filterAndRenderFiles();
        
        showSuccess('All data cleared successfully!');
    }
}

// Utility functions
function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        z-index: 1001;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-weight: 500;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        animation: slideIn 0.3s ease-out;
    `;
    
    // Add slide-in animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => {
            notification.remove();
            style.remove();
        }, 300);
    }, type === 'error' ? 5000 : 3000);
}

// Make functions globally available for onclick handlers
window.toggleFolder = toggleFolder;
window.toggleFolderSelection = toggleFolderSelection;
window.toggleDirectory = toggleDirectory;
window.openFileModal = openFileModal;
