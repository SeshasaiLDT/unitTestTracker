// Java Unit Test Tracker - Optimized for Large Projects
// Global state
let allFiles = [];
let filteredFiles = [];
let folderStructure = {};
let currentEditingFile = null;
let selectedFolders = new Set();
let isProcessing = false;

// Performance optimization constants
const BATCH_SIZE = 100; // Process files in batches
const RENDER_BATCH_SIZE = 50; // Render files in smaller batches
const VIRTUAL_SCROLL_THRESHOLD = 1000; // Use virtual scrolling for large lists

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
    
    // Progress modal
    elements.progressModal = document.getElementById('progressModal');
    elements.progressFill = document.getElementById('progressFill');
    elements.progressPercentage = document.getElementById('progressPercentage');
    elements.progressStatus = document.getElementById('progressStatus');
    elements.progressMessage = document.getElementById('progressMessage');
    elements.progressStats = document.getElementById('progressStats');
}

// Setup event listeners
function setupEventListeners() {
    // File upload
    elements.folderInput?.addEventListener('change', handleFolderUpload);
    elements.fileInput?.addEventListener('change', handleFileUpload);
    
    // Search and filtering (debounced for performance)
    elements.searchInput?.addEventListener('input', debounce(filterAndRenderFiles, 300));
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

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Handle folder upload with progress tracking
async function handleFolderUpload(event) {
    if (isProcessing) {
        alert('Already processing files. Please wait...');
        return;
    }
    
    const files = Array.from(event.target.files);
    await processFilesOptimized(files);
}

// Handle individual file upload
async function handleFileUpload(event) {
    if (isProcessing) {
        alert('Already processing files. Please wait...');
        return;
    }
    
    const files = Array.from(event.target.files);
    await processFilesOptimized(files);
}

// Optimized file processing with batching and progress updates
async function processFilesOptimized(fileList) {
    isProcessing = true;
    showProgressModal();
    const startTime = Date.now();
    
    try {
        const javaFiles = fileList.filter(file => file.name.endsWith('.java'));
        
        if (javaFiles.length === 0) {
            hideProgressModal();
            alert('No Java files found in the selected folder.');
            return;
        }
        
        // Show progress information
        updateProgress(0, `Found ${javaFiles.length} Java files. Starting processing...`, 'Initializing...');
        
        // Create lookup maps for faster file detection (O(1) instead of O(n))
        const testFileMap = new Map();
        const docFileMap = new Map();
        
        updateProgress(5, 'Building file index for faster detection...', 'Creating lookup maps...');
        
        // Build lookup maps for test and doc files
        fileList.forEach((file, index) => {
            const path = file.webkitRelativePath || file.name;
            const fileName = file.name;
            
            if (fileName.endsWith('_tests.java')) {
                const baseFileName = fileName.replace('_tests.java', '.java');
                testFileMap.set(baseFileName, file);
                testFileMap.set(path.replace('_tests.java', '.java'), file);
            } else if (fileName.endsWith('.pdf')) {
                const baseFileName = fileName.replace('.pdf', '.java');
                docFileMap.set(baseFileName, file);
                docFileMap.set(path.replace('.pdf', '.java'), file);
            }
            
            // Update progress during index building for large file lists
            if (fileList.length > 10000 && index % 1000 === 0) {
                const indexProgress = 5 + (index / fileList.length) * 10;
                updateProgress(indexProgress, `Building index... ${index}/${fileList.length}`, 'Processing file mappings...');
            }
        });
        
        updateProgress(15, 'Processing Java files in optimized batches...', 'Starting batch processing...');
        
        // Process files in batches to prevent UI blocking
        const processedFiles = [];
        const totalBatches = Math.ceil(javaFiles.length / BATCH_SIZE);
        
        for (let i = 0; i < javaFiles.length; i += BATCH_SIZE) {
            const batch = javaFiles.slice(i, i + BATCH_SIZE);
            const currentBatch = Math.floor(i / BATCH_SIZE) + 1;
            const batchProgress = 15 + ((currentBatch - 1) / totalBatches) * 60; // 15% to 75%
            
            // Calculate time estimates
            const processedSoFar = i;
            const elapsed = Date.now() - startTime;
            const timePerFile = processedSoFar > 0 ? elapsed / processedSoFar : 0;
            const remaining = javaFiles.length - processedSoFar;
            const estimatedTimeRemaining = timePerFile * remaining;
            
            updateProgress(
                batchProgress, 
                `Processing batch ${currentBatch}/${totalBatches}`,
                `Files ${i + 1}-${Math.min(i + BATCH_SIZE, javaFiles.length)} of ${javaFiles.length}`,
                estimatedTimeRemaining > 0 ? `Estimated time remaining: ${formatTime(estimatedTimeRemaining)}` : ''
            );
            
            const batchResults = batch.map(file => processIndividualFile(file, testFileMap, docFileMap));
            processedFiles.push(...batchResults);
            
            // Allow UI to update between batches
            await new Promise(resolve => setTimeout(resolve, 20));
        }
        
        updateProgress(80, 'Merging with existing files...', 'Checking for duplicates...');
        
        // Merge with existing files (avoid duplicates)
        const existingPaths = new Set(allFiles.map(f => f.relativePath));
        const newFiles = processedFiles.filter(f => !existingPaths.has(f.relativePath));
        
        allFiles = [...allFiles, ...newFiles];
        
        updateProgress(85, 'Saving progress to local storage...', 'Persisting data...');
        
        // Save to localStorage
        saveToLocalStorage();
        
        updateProgress(90, 'Building folder structure...', 'Organizing files into hierarchy...');
        
        // Update UI
        await buildFolderStructureOptimized();
        updateStatistics();
        updateUI();
        
        updateProgress(95, 'Rendering file tree...', 'Preparing display...');
        await filterAndRenderFilesOptimized();
        
        updateProgress(100, 'Complete!', `Successfully processed ${newFiles.length} new files!`);
        
        // Hide progress modal after a brief delay
        setTimeout(() => {
            hideProgressModal();
            showSuccess(`Successfully processed ${newFiles.length} new Java files out of ${javaFiles.length} total!`);
        }, 1000);
        
    } catch (error) {
        console.error('Error processing files:', error);
        showError('Error processing files: ' + error.message);
    } finally {
        isProcessing = false;
        elements.loading.style.display = 'none';
    }
}

// Process individual file with optimized lookups
function processIndividualFile(file, testFileMap, docFileMap) {
    const filePath = file.webkitRelativePath || file.name;
    const pathParts = filePath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const directory = pathParts.slice(0, -1).join('/') || 'root';
    
    // Fast lookup for test and doc files using maps
    const testFile = testFileMap.get(fileName) || testFileMap.get(filePath);
    const docFile = docFileMap.get(fileName) || docFileMap.get(filePath);
    
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
}

// Update loading message
function updateLoadingMessage(message) {
    const loadingElement = elements.loading?.querySelector('p');
    if (loadingElement) {
        loadingElement.textContent = message;
    }
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Optimized folder structure building
async function buildFolderStructureOptimized() {
    folderStructure = {};
    
    // Process in batches to prevent UI blocking
    for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
        const batch = allFiles.slice(i, i + BATCH_SIZE);
        
        batch.forEach(file => {
            const pathParts = file.directory.split('/').filter(part => part);
            let currentLevel = folderStructure;
            
            pathParts.forEach(part => {
                if (!currentLevel[part]) {
                    currentLevel[part] = { files: [], subfolders: {} };
                }
                currentLevel = currentLevel[part].subfolders;
            });
            
            // Add file to the appropriate folder
            const finalFolder = pathParts.length > 0 ? 
                pathParts.reduce((level, part) => level[part], folderStructure) :
                { files: [] };
                
            if (!finalFolder.files) finalFolder.files = [];
            finalFolder.files.push(file);
        });
        
        // Allow UI to update
        if (i % (BATCH_SIZE * 5) === 0) {
            await new Promise(resolve => setTimeout(resolve, 5));
        }
    }
    
    renderFolderTree();
}

// Rest of the functions remain similar but with optimizations...
// [Continuing with optimized versions of remaining functions]

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

// Optimized filtering and rendering
async function filterAndRenderFilesOptimized() {
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
        let matchesFolder = selectedFolders.size === 0;
        if (selectedFolders.size > 0) {
            selectedFolders.forEach(folderPath => {
                if (file.directory.startsWith(folderPath) || file.directory === folderPath) {
                    matchesFolder = true;
                }
            });
        }
        
        return matchesSearch && matchesFilter && matchesFolder;
    });
    
    await renderFileTreeOptimized();
}

// Alias for backward compatibility
const filterAndRenderFiles = filterAndRenderFilesOptimized;

// Optimized file tree rendering with virtual scrolling for large lists
async function renderFileTreeOptimized() {
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
    
    // For very large lists, implement virtual scrolling
    if (filteredFiles.length > VIRTUAL_SCROLL_THRESHOLD) {
        await renderVirtualScrollList();
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
    const directories = Object.keys(groupedFiles).sort();
    
    // Render in batches to prevent UI blocking
    for (let i = 0; i < directories.length; i += RENDER_BATCH_SIZE) {
        const batch = directories.slice(i, i + RENDER_BATCH_SIZE);
        
        batch.forEach(directory => {
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
                        ${files.slice(0, 100).map(file => renderFileItem(file)).join('')}
                        ${files.length > 100 ? `<div class="load-more-files" onclick="loadMoreFiles('${directory}')">Load ${files.length - 100} more files...</div>` : ''}
                    </div>
                </div>
            `;
        });
        
        // Update UI in batches
        if (i % RENDER_BATCH_SIZE === 0) {
            await new Promise(resolve => setTimeout(resolve, 5));
        }
    }
    
    elements.fileTreeContainer.innerHTML = html;
}

// Virtual scrolling for very large lists
async function renderVirtualScrollList() {
    const container = elements.fileTreeContainer;
    const itemHeight = 60; // Approximate height of each file item
    const containerHeight = 600; // Max height of container
    const visibleItems = Math.ceil(containerHeight / itemHeight);
    
    let scrollTop = 0;
    let startIndex = 0;
    let endIndex = Math.min(visibleItems, filteredFiles.length);
    
    function renderVisibleItems() {
        const totalHeight = filteredFiles.length * itemHeight;
        const offsetY = startIndex * itemHeight;
        
        const html = `
            <div style="height: ${totalHeight}px; position: relative;">
                <div style="transform: translateY(${offsetY}px);">
                    ${filteredFiles.slice(startIndex, endIndex).map(file => renderFileItem(file)).join('')}
                </div>
            </div>
            <div class="virtual-scroll-info">
                Showing ${startIndex + 1}-${endIndex} of ${filteredFiles.length} files
            </div>
        `;
        
        container.innerHTML = html;
    }
    
    // Add scroll listener for virtual scrolling
    container.addEventListener('scroll', () => {
        scrollTop = container.scrollTop;
        startIndex = Math.floor(scrollTop / itemHeight);
        endIndex = Math.min(startIndex + visibleItems + 5, filteredFiles.length); // Buffer of 5 items
        renderVisibleItems();
    });
    
    renderVisibleItems();
}

// Load more files for a specific directory
function loadMoreFiles(directory) {
    const dirElement = document.getElementById(`dir-${directory.replace(/[^a-zA-Z0-9]/g, '-')}`);
    if (!dirElement) return;
    
    const groupedFiles = {};
    filteredFiles.forEach(file => {
        if (!groupedFiles[file.directory]) {
            groupedFiles[file.directory] = [];
        }
        groupedFiles[file.directory].push(file);
    });
    
    const files = groupedFiles[directory] || [];
    const currentCount = dirElement.querySelectorAll('.file-item').length;
    const nextBatch = files.slice(currentCount, currentCount + 100);
    
    const loadMoreButton = dirElement.querySelector('.load-more-files');
    if (loadMoreButton) {
        loadMoreButton.remove();
    }
    
    nextBatch.forEach(file => {
        const fileElement = document.createElement('div');
        fileElement.innerHTML = renderFileItem(file);
        dirElement.appendChild(fileElement.firstElementChild);
    });
    
    if (files.length > currentCount + 100) {
        const newLoadMoreButton = document.createElement('div');
        newLoadMoreButton.className = 'load-more-files';
        newLoadMoreButton.onclick = () => loadMoreFiles(directory);
        newLoadMoreButton.textContent = `Load ${files.length - currentCount - 100} more files...`;
        dirElement.appendChild(newLoadMoreButton);
    }
}

// Render individual file item (unchanged)
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
            buildFolderStructureOptimized();
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
                buildFolderStructureOptimized();
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
        
        buildFolderStructureOptimized();
        updateStatistics();
        updateUI();
        filterAndRenderFiles();
        
        showSuccess('All data cleared successfully!');
    }
}

// Progress Modal Functions
function showProgressModal() {
    const progressModal = document.getElementById('progressModal');
    if (progressModal) {
        progressModal.style.display = 'block';
        // Reset progress state
        updateProgress(0, 'Starting...', 'Initializing file processing...');
    }
}

function hideProgressModal() {
    const progressModal = document.getElementById('progressModal');
    if (progressModal) {
        setTimeout(() => {
            progressModal.style.display = 'none';
        }, 1000); // Show completion for 1 second before hiding
    }
}

function updateProgress(percentage, status, message, stats = '') {
    const progressFill = document.getElementById('progressFill');
    const progressPercentage = document.getElementById('progressPercentage');
    const progressStatus = document.getElementById('progressStatus');
    const progressMessage = document.getElementById('progressMessage');
    const progressStats = document.getElementById('progressStats');
    
    if (progressFill) {
        progressFill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
    }
    
    if (progressPercentage) {
        progressPercentage.textContent = `${Math.round(percentage)}%`;
    }
    
    if (progressStatus) {
        progressStatus.textContent = status;
    }
    
    if (progressMessage) {
        progressMessage.textContent = message;
    }
    
    if (progressStats && stats) {
        progressStats.textContent = stats;
    }
    
    // Add completion styling when done
    if (percentage >= 100) {
        if (progressStatus) {
            progressStatus.style.color = '#28a745';
        }
        if (progressMessage) {
            progressMessage.style.color = '#28a745';
        }
    }
}

// Helper function to format time
function formatTime(milliseconds) {
    if (milliseconds < 1000) return 'less than 1 second';
    
    const seconds = Math.floor(milliseconds / 1000);
    if (seconds < 60) return `${seconds} seconds`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes < 60) {
        return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes} minutes`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
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
window.loadMoreFiles = loadMoreFiles;
