// Java Unit Test Tracker - Optimized for Large Projects
// Global state
let allFiles = [];
let filteredFiles = [];
let folderStructure = {};
let currentEditingFile = null;
let selectedFolders = new Set();
let isProcessing = false;
let developerAssignments = {}; // Store developer assignments per folder path

// Performance optimization constants
const BATCH_SIZE = 2000; // Process files in batches to prevent UI blocking
const RENDER_BATCH_SIZE = 50; // Render files in smaller batches
const VIRTUAL_SCROLL_THRESHOLD = 5000; // Use virtual scrolling for very large lists
const LARGE_DATASET_THRESHOLD = 10000; // Enhanced optimizations for very large datasets
const MAX_INITIAL_RENDER = 500; // Limit initial render for performance

// Web Worker support check
const SUPPORTS_WEB_WORKERS = typeof Worker !== 'undefined';

// Performance monitoring
let performanceMetrics = {
    startTime: null,
    processingTime: null,
    renderTime: null,
    totalFiles: 0
};

// DOM Elements Cache
const elements = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    setupEventListeners();
    loadFromLocalStorage();
    loadDeveloperAssignments();
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
    
    // Tree controls
    elements.expandAll = document.getElementById('expandAll');
    elements.collapseAll = document.getElementById('collapseAll');
    elements.selectAll = document.getElementById('selectAll');
    elements.deselectAll = document.getElementById('deselectAll');
    
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
    // File upload - with safety checks
    if (elements.folderInput) {
        elements.folderInput.addEventListener('change', handleFolderUpload);
    } else {
        console.error('Warning: folderInput element not found in the DOM');
    }
    
    if (elements.fileInput) {
        elements.fileInput.addEventListener('change', handleFileUpload);
    } else {
        console.error('Warning: fileInput element not found in the DOM');
    }
    
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
    
    // Tree controls
    elements.expandAll?.addEventListener('click', expandAllFolders);
    elements.collapseAll?.addEventListener('click', collapseAllFolders);
    elements.selectAll?.addEventListener('click', selectAllFolders);
    elements.deselectAll?.addEventListener('click', deselectAllFolders);
    
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
    
    console.log("Folder upload triggered:", event);
    
    // Safety check to ensure the event and its target exist
    if (!event || !event.target || !event.target.files) {
        console.error('Invalid event object in handleFolderUpload', event);
        alert('Error accessing files. Please try again.');
        return;
    }
    
    try {
        // Debug the file selection
        console.log("Files selected:", event.target.files.length);
        
        // Convert FileList to Array with proper error handling
        let files = [];
        try {
            files = Array.from(event.target.files || []);
        } catch (err) {
            console.error("Error converting FileList to Array:", err);
            
            // Fallback to manual copy
            files = [];
            for (let i = 0; i < event.target.files.length; i++) {
                files.push(event.target.files[i]);
            }
        }
        
        if (files.length === 0) {
            alert('No files selected. Please select a folder containing Java files.');
            return;
        }
        
        console.log("First few files:", files.slice(0, 3));
        
        // Ensure webkitRelativePath exists (fix for Firefox/some browsers)
        files = files.map(file => {
            if (!file.webkitRelativePath && file.name && file.path) {
                console.log("Adding missing webkitRelativePath", file.name);
                file.webkitRelativePath = file.path || file.name;
            }
            return file;
        });
        
        await processFilesOptimized(files);
    } catch (error) {
        console.error("Critical error in handleFolderUpload:", error);
        alert('Error processing folder: ' + error.message);
        isProcessing = false;
        hideProgressModal();
    }
}

// Handle individual file upload
async function handleFileUpload(event) {
    if (isProcessing) {
        alert('Already processing files. Please wait...');
        return;
    }
    
    // Safety check to ensure the event and its target exist
    if (!event || !event.target || !event.target.files) {
        console.error('Invalid event object in handleFileUpload', event);
        alert('Error accessing files. Please try again.');
        return;
    }
    
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
        alert('No files selected. Please select Java files to process.');
        return;
    }
    
    await processFilesOptimized(files);
}

// Optimized file processing with batching and progress updates
async function processFilesOptimized(fileList) {
    isProcessing = true;
    showProgressModal();
    const startTime = Date.now();
    
    try {
        // Initial filtering to avoid processing non-Java files
        console.log(`Total files to process: ${fileList.length}`);
        updateProgress(0, `Processing ${fileList.length} files...`, 'Filtering Java files...');
        
        // Use more efficient filtering for large file sets
        let javaFiles = [];
        let nonJavaCount = 0;
        // Adjust chunk size based on total file count for better performance
        const chunkSize = fileList.length > 100000 ? 10000 : 
                          fileList.length > 50000 ? 5000 : 3000; 
        
        for (let i = 0; i < fileList.length; i += chunkSize) {
            const chunk = fileList.slice(i, i + chunkSize);
            
            // Filter in smaller batches - focus only on Java files to save memory
            const javaChunk = chunk.filter(file => {
                if (!file || !file.name) return false;
                const isJava = file.name.toLowerCase().endsWith('.java');
                if (!isJava) nonJavaCount++;
                return isJava;
            });
            
            javaFiles.push(...javaChunk);
            
            // Update progress less frequently for very large datasets
            const updateFrequency = fileList.length > 100000 ? chunkSize * 5 : 
                                   fileList.length > 50000 ? chunkSize * 2 : chunkSize;
                                   
            if (i % updateFrequency === 0 || i + chunkSize >= fileList.length) {
                const percent = Math.min(5, Math.round((i / fileList.length) * 5));
                updateProgress(
                    percent, 
                    `Filtering Java files... (${i}/${fileList.length})`,
                    `Found ${javaFiles.length} Java files so far, skipped ${nonJavaCount} non-Java files`
                );
                // Allow UI to update - shorter delay for better performance
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }
        
        console.log(`Java files found: ${javaFiles.length}`);
        
        if (javaFiles.length === 0) {
            hideProgressModal();
            alert('No Java files found in the selected folder.');
            return;
        }
        
        // Show progress information
        updateProgress(5, `Found ${javaFiles.length} Java files. Starting processing...`, 'Initializing...');
        
        // Create lookup maps for faster file detection (O(1) instead of O(n))
        const testFileMap = new Map();
        const docFileMap = new Map();
        
        updateProgress(7, 'Building file index for faster detection...', 'Creating lookup maps...');
        
        // Build lookup maps for test and doc files - only scan certain file types for efficiency
        const totalFiles = fileList.length;
        let processedCount = 0;
        
        // Use a larger chunk size for very large datasets to improve performance
        const indexChunkSize = fileList.length > 100000 ? 20000 : 
                              fileList.length > 50000 ? 10000 : chunkSize;
        
        // Process in chunks to avoid freezing the UI
        for (let i = 0; i < totalFiles; i += indexChunkSize) {
            const filesChunk = fileList.slice(i, Math.min(i + indexChunkSize, totalFiles));
            const testFiles = [];
            const docFiles = [];
            
            // First separate the files by type to reduce memory pressure
            filesChunk.forEach(file => {
                if (!file || !file.name) return;
                
                const fileName = file.name.toLowerCase();
                
                // Only collect test files and PDF files for mapping
                if (fileName.endsWith('_tests.java')) {
                    testFiles.push(file);
                } 
                else if (fileName.endsWith('.pdf')) {
                    docFiles.push(file);
                }
            });
            
            // Now process each type separately
            testFiles.forEach(file => {
                const path = file.webkitRelativePath || file.name;
                const fileName = file.name.toLowerCase();
                const baseFileName = fileName.replace('_tests.java', '.java');
                testFileMap.set(baseFileName, file);
                
                // Also map with the full path
                const pathWithoutTest = path.toLowerCase().replace('_tests.java', '.java');
                testFileMap.set(pathWithoutTest, file);
            });
            
            docFiles.forEach(file => {
                const path = file.webkitRelativePath || file.name;
                const fileName = file.name.toLowerCase();
                const baseFileName = fileName.replace('.pdf', '.java');
                docFileMap.set(baseFileName, file);
                
                // Also map with the full path
                const pathWithoutExt = path.toLowerCase().replace('.pdf', '.java');
                docFileMap.set(pathWithoutExt, file);
            });
            
            processedCount += filesChunk.length;
            
            // Update progress less frequently for better performance
            const updateFrequency = fileList.length > 100000 ? indexChunkSize * 2 : indexChunkSize;
            
            if (i % updateFrequency === 0 || i + indexChunkSize >= totalFiles) {
                const indexProgress = 7 + (processedCount / totalFiles) * 8;
                updateProgress(
                    indexProgress, 
                    `Building index... (${processedCount}/${totalFiles})`, 
                    `Found ${testFileMap.size} test files and ${docFileMap.size} doc files`
                );
                await new Promise(resolve => setTimeout(resolve, 1)); // Shorter delay for UI update
            }
        }
        
        console.log(`Index built: ${testFileMap.size} test files, ${docFileMap.size} doc files`);
        updateProgress(15, 'Processing Java files in optimized batches...', 'Starting batch processing...');
        
        // Use dynamic batch sizing for optimal performance
        const optimalBatchSize = getOptimalBatchSize(javaFiles.length);
        const processedFiles = [];
        const totalBatches = Math.ceil(javaFiles.length / optimalBatchSize);
        
        // Performance tracking
        performanceMetrics.totalFiles = javaFiles.length;
        const processingStartTime = Date.now();
        
        // For very large datasets, reduce console logging and use specialized processing
        const isVeryLargeDataset = javaFiles.length > 10000;
        const isExtremelyLargeDataset = javaFiles.length > 50000;
        
        // For extremely large datasets, further optimize batch size and processing
        const processingChunkSize = isExtremelyLargeDataset ? optimalBatchSize * 2 : optimalBatchSize;
        
        console.log(`Processing ${javaFiles.length} Java files with batch size ${processingChunkSize}`);
        
        // Pre-allocate array for better performance with large sets
        processedFiles = new Array(javaFiles.length);
        let fileProcessedCount = 0;
        
        for (let i = 0; i < javaFiles.length; i += processingChunkSize) {
            const batch = javaFiles.slice(i, i + processingChunkSize);
            const currentBatch = Math.floor(i / processingChunkSize) + 1;
            const totalBatchesAdjusted = Math.ceil(javaFiles.length / processingChunkSize);
            const batchProgress = 15 + ((currentBatch - 1) / totalBatchesAdjusted) * 60; // 15% to 75%
            
            // Calculate time estimates (less frequently for large sets)
            const updateFrequency = isExtremelyLargeDataset ? processingChunkSize * 2 : 
                                   isVeryLargeDataset ? processingChunkSize : processingChunkSize / 2;
                                   
            if (i % updateFrequency === 0 || i + processingChunkSize >= javaFiles.length) {
                const processedSoFar = i;
                const elapsed = Date.now() - startTime;
                const timePerFile = processedSoFar > 0 ? elapsed / processedSoFar : 0;
                const remaining = javaFiles.length - processedSoFar;
                const estimatedTimeRemaining = timePerFile * remaining;
                
                updateProgress(
                    batchProgress, 
                    `Processing batch ${currentBatch}/${totalBatchesAdjusted}`,
                    `Files ${i + 1}-${Math.min(i + processingChunkSize, javaFiles.length)} of ${javaFiles.length}`,
                    estimatedTimeRemaining > 0 ? `Estimated time remaining: ${formatTime(estimatedTimeRemaining)}` : ''
                );
            }
            
            // Process the batch efficiently
            const batchResults = [];
            for (const file of batch) {
                batchResults.push(processIndividualFile(file, testFileMap, docFileMap));
            }
            
            // Add results to the pre-allocated array
            for (let j = 0; j < batchResults.length; j++) {
                processedFiles[fileProcessedCount + j] = batchResults[j];
            }
            fileProcessedCount += batchResults.length;
            
            // Allow UI to update between batches - less frequently for large sets
            const uiUpdateDelay = isExtremelyLargeDataset ? 1 : 5; // Faster UI updates for large datasets
            
            if (i % updateFrequency === 0 || i + processingChunkSize >= javaFiles.length) {
                await new Promise(resolve => setTimeout(resolve, uiUpdateDelay));
            }
        }
        
        // Make sure we don't have any undefined entries in the array
        processedFiles = processedFiles.filter(file => file !== undefined);
        
        updateProgress(80, 'Merging with existing files...', 'Checking for duplicates...');
        
        // For very large datasets, use more efficient Set operations
        const isVeryLarge = processedFiles.length > 5000;
        let newFiles = [];
        
        if (isVeryLarge) {
            // Use a more memory-efficient approach
            updateProgress(82, 'Using optimized merge for large dataset...', `Processing ${processedFiles.length} files`);
            
            // Build set of paths for faster lookups
            const existingPaths = new Set();
            allFiles.forEach(file => existingPaths.add(file.relativePath));
            
            // Filter in smaller chunks to avoid memory issues
            const mergeChunkSize = 2000;
            for (let i = 0; i < processedFiles.length; i += mergeChunkSize) {
                const chunk = processedFiles.slice(i, i + mergeChunkSize);
                const newChunk = chunk.filter(f => !existingPaths.has(f.relativePath));
                newFiles.push(...newChunk);
                
                if (i % (mergeChunkSize * 2) === 0) {
                    updateProgress(
                        82 + (i / processedFiles.length) * 2,
                        `Merging files... (${i}/${processedFiles.length})`,
                        `Found ${newFiles.length} new files so far`
                    );
                    await new Promise(resolve => setTimeout(resolve, 5));
                }
            }
        } else {
            // For smaller sets, use the original approach
            const existingPaths = new Set(allFiles.map(f => f.relativePath));
            newFiles = processedFiles.filter(f => !existingPaths.has(f.relativePath));
        }
        
        // For very large datasets, consider limiting how many new files we add at once
        // to avoid memory issues with extremely large uploads
        const maxFilesToAddAtOnce = 1000000; // Increased to 1 million files
        if (newFiles.length > maxFilesToAddAtOnce) {
            console.warn(`Limiting new files to ${maxFilesToAddAtOnce} out of ${newFiles.length} to prevent memory issues`);
            newFiles = newFiles.slice(0, maxFilesToAddAtOnce);
            
            // Show a warning to the user
            setTimeout(() => {
                alert(`Warning: Only the first ${maxFilesToAddAtOnce} new files were imported to prevent browser performance issues. Try uploading in smaller batches.`);
            }, 1000);
        }
        
        console.log(`Adding ${newFiles.length} new files to existing ${allFiles.length} files`);
        allFiles = [...allFiles, ...newFiles];
        
        updateProgress(85, 'Saving progress to local storage...', 'Persisting data...');
        
        try {
            // Save in chunks for very large datasets to avoid memory errors
            if (allFiles.length > 10000) {
                // Use a more efficient storage approach
                saveToLocalStorageLarge();
            } else {
                // Standard approach for smaller datasets
                saveToLocalStorage();
            }
        } catch (err) {
            console.error('Error saving to localStorage:', err);
            // Fallback handling when localStorage fails (often due to quota limits)
            showError('Warning: Unable to save all files to local storage due to browser limits. Your data is in memory but may not persist if you close the browser.');
        }
        
        updateProgress(90, 'Building folder structure...', 'Organizing files into hierarchy...');
        
        // Record processing completion time
        performanceMetrics.processingTime = Date.now() - processingStartTime;
        const renderStartTime = Date.now();
        
        // Update UI
        await buildFolderStructureOptimized();
        updateStatistics();
        updateUI();
        
        updateProgress(95, 'Rendering file tree...', 'Preparing display...');
        await filterAndRenderFilesOptimized();
        
        // Record total performance metrics
        performanceMetrics.renderTime = Date.now() - renderStartTime;
        
        updateProgress(100, 'Complete!', `Successfully processed ${newFiles.length} new files!`);
        
        // Report performance metrics
        reportPerformanceMetrics(
            performanceMetrics.totalFiles,
            performanceMetrics.processingTime,
            performanceMetrics.renderTime
        );
        
        // Hide progress modal after a brief delay
        setTimeout(() => {
            hideProgressModal();
            showSuccess(`Successfully processed ${newFiles.length} new Java files out of ${javaFiles.length} total!`);
        }, 1000);
        
    } catch (error) {
        console.error('Error processing files:', error);
        
        // Hide the progress modal first
        hideProgressModal();
        
        // Show a more detailed error message
        let errorMessage = 'Error processing files: ' + (error.message || 'Unknown error');
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
        
        // Check for specific error types and provide more helpful messages
        if (error.message && error.message.includes('Cannot read properties of undefined')) {
            errorMessage = 'Error accessing file properties. Please try uploading the folder again.';
        }
        
        showError(errorMessage);
    } finally {
        isProcessing = false;
        if (elements.loading) {
            elements.loading.style.display = 'none';
        }
    }
}

// Process individual file with optimized lookups
function processIndividualFile(file, testFileMap, docFileMap) {
    try {
        // Input validation
        if (!file) {
            console.error("Null or undefined file passed to processIndividualFile");
            throw new Error("Invalid file object");
        }
        
        if (!file.name) {
            console.error("File object missing name property:", file);
            throw new Error("File missing required properties");
        }
        
        // Get file path and handle potential path format issues
        const filePath = file.webkitRelativePath || file.name;
        
        // Normalize path separators (handle both Windows and Unix paths)
        const normalizedPath = filePath.replace(/\\/g, '/');
        
        // Parse path components
        const pathParts = normalizedPath.split('/');
        const fileName = pathParts[pathParts.length - 1];
        const directory = pathParts.slice(0, -1).join('/') || 'root';
        
        // Debug logging for problematic files
        if (!fileName || fileName.length === 0) {
            console.warn("Warning: Empty file name detected", file);
        }
        
        // Additional debug information for paths
        console.log(`Processing file: ${fileName}, Directory: ${directory}`);
        
        // Fast lookup for test and doc files using maps (with safeguards)
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
    } catch (error) {
        console.error("Error in processIndividualFile:", error, file);
        
        // Return a safe default object to avoid crashing
        return {
            id: generateId(),
            name: file?.name || "unknown-file",
            relativePath: file?.webkitRelativePath || file?.name || "unknown-path",
            directory: "errors",
            testCompleted: false,
            docCompleted: false,
            autoDetectedTest: false,
            autoDetectedDoc: false,
            testFile: null,
            docFile: null,
            notes: 'Error processing this file: ' + error.message,
            lastModified: new Date().toISOString(),
            hasError: true
        };
    }
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

// Calculate optimal batch size based on file count and system capabilities
function getOptimalBatchSize(fileCount) {
    // Base batch size
    let batchSize = BATCH_SIZE;
    
    // Progressive scaling based on file count
    if (fileCount < 1000) {
        batchSize = Math.min(100, fileCount);
    } else if (fileCount < 5000) {
        batchSize = 250;
    } else if (fileCount < 10000) {
        batchSize = 500;
    } else if (fileCount < 25000) {
        batchSize = 1000;
    } else if (fileCount < 50000) {
        batchSize = 2000;
    } else if (fileCount < 100000) {
        batchSize = 3000;
    } else if (fileCount < 500000) {
        // For extremely large datasets, process in even larger batches
        batchSize = 5000;
    } else {
        // Ultra-large datasets
        batchSize = 10000;
    }
    
    // Take into account browser performance capabilities
    try {
        // Detect browser capability (rough estimation)
        const isHighPerformanceBrowser = 
            window.navigator.hardwareConcurrency > 4 || 
            window.navigator.deviceMemory > 4;
            
        // Adjust based on available memory (rough estimation)
        const availableMemory = navigator.deviceMemory || 4; // Default to 4GB if not available
        
        if (availableMemory < 2) {
            // Low memory devices - reduce batch size
            batchSize = Math.floor(batchSize * 0.5);
            console.log('Low memory device detected, reducing batch size');
        } else if (isHighPerformanceBrowser && availableMemory > 8) {
            // High performance devices - increase batch size
            batchSize = Math.floor(batchSize * 1.5);
            console.log('High performance device detected, increasing batch size');
        }
    } catch (e) {
        console.warn('Could not detect browser capabilities, using default batch size', e);
    }
    
    // Set reasonable limits regardless of calculations
    batchSize = Math.max(50, Math.min(batchSize, 10000));
    
    console.log(`Using batch size of ${batchSize} for ${fileCount} files`);
    return batchSize;
}

// Optimized folder structure building
async function buildFolderStructureOptimized() {
    folderStructure = {};
    
    // Normalize all file paths to use consistent separators
    allFiles.forEach(file => {
        if (file.relativePath) {
            // Convert Windows backslashes to forward slashes for consistency
            file.normalizedPath = file.relativePath.replace(/\\/g, '/');
            
            // Extract directory path from the normalized path
            const lastSlashIndex = file.normalizedPath.lastIndexOf('/');
            file.directory = lastSlashIndex > -1 ? file.normalizedPath.substring(0, lastSlashIndex) : '';
        }
    });
    
    // Process in batches to prevent UI blocking
    for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
        const batch = allFiles.slice(i, i + BATCH_SIZE);
        
        batch.forEach(file => {
            try {
                if (!file || typeof file.directory === 'undefined') {
                    console.error("Invalid file object encountered:", file);
                    return; // Skip this file
                }
                
                // Split the directory path into parts
                const pathParts = file.directory.split('/').filter(part => part);
                
                // Navigate/create the folder structure
                let currentLevel = folderStructure;
                let currentPath = '';
                
                for (const part of pathParts) {
                    currentPath = currentPath ? `${currentPath}/${part}` : part;
                    
                    if (!currentLevel[part]) {
                        currentLevel[part] = { 
                            files: [], 
                            subfolders: {},
                            path: currentPath  // Store the full path for reference
                        };
                    }
                    currentLevel = currentLevel[part].subfolders;
                }
                
                // Add file to the appropriate folder
                let targetFolder;
                
                if (pathParts.length > 0) {
                    // Navigate to the correct folder
                    targetFolder = folderStructure;
                    for (let j = 0; j < pathParts.length; j++) {
                        if (!targetFolder[pathParts[j]]) {
                            console.error(`Folder structure missing at ${pathParts.slice(0, j+1).join('/')} for file ${file.name}`);
                            break;
                        }
                        if (j === pathParts.length - 1) {
                            // We've reached the target folder
                            targetFolder[pathParts[j]].files.push(file);
                        } else {
                            // Move down a level
                            targetFolder = targetFolder[pathParts[j]].subfolders;
                        }
                    }
                } else {
                    // Root level files
                    if (!folderStructure.root) {
                        folderStructure.root = { files: [], subfolders: {}, path: '' };
                    }
                    folderStructure.root.files.push(file);
                }
            } catch (err) {
                console.error("Error processing file in buildFolderStructureOptimized:", err, file);
            }
        });
        
        // Allow UI to update
        if (i % (BATCH_SIZE * 5) === 0) {
            await new Promise(resolve => setTimeout(resolve, 5));
            console.log(`Processed ${Math.min(i + BATCH_SIZE, allFiles.length)} of ${allFiles.length} files...`);
        }
    }
    
    console.log("Folder structure built. Rendering folder tree...");
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
function renderFolderLevel(structure, path, level = 0) {
    let html = '';
    
    Object.keys(structure).sort().forEach(folderName => {
        const folder = structure[folderName];
        const fullPath = path ? `${path}/${folderName}` : folderName;
        const isSelected = selectedFolders.has(fullPath);
        const hasSubfolders = Object.keys(folder.subfolders).length > 0;
        const fileCount = folder.files ? folder.files.length : 0;
        const developerId = `dev-${fullPath.replace(/[^a-zA-Z0-9]/g, '-')}`;
        const savedDeveloper = developerAssignments[fullPath] || '';
        
        html += `
            <div class="tree-item">
                <div class="tree-folder tree-level-${level} ${isSelected ? 'active' : ''}" 
                     style="--indent-level: ${level}; --parent-indent: ${level}" 
                     onclick="toggleFolder('${fullPath}')">
                    <div class="tree-folder-content">
                        <input type="checkbox" class="tree-checkbox" ${isSelected ? 'checked' : ''} 
                               onchange="toggleFolderSelection('${fullPath}', this.checked)" onclick="event.stopPropagation()">
                        <span class="tree-icon">${hasSubfolders ? '📁' : '📂'}</span>
                        <span class="folder-name">${folderName}</span>
                        <span class="file-count">(${fileCount})</span>
                        <input type="text" class="developer-input" id="${developerId}" 
                               placeholder="Developer" value="${savedDeveloper}"
                               onchange="updateDeveloperAssignment('${fullPath}', this.value)"
                               onclick="event.stopPropagation()"
                               title="Assign developer to this folder">
                    </div>
                </div>
        `;
        
        if (hasSubfolders) {
            html += `
                <div class="tree-children" id="children-${fullPath.replace(/[^a-zA-Z0-9]/g, '-')}"
                     style="--parent-indent: ${level + 1}">
                    ${renderFolderLevel(folder.subfolders, fullPath, level + 1)}
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
    
    console.log(`Rendering ${filteredFiles.length} files...`);
    
    // Group files by directory using the full path hierarchy
    const groupedFiles = {};
    filteredFiles.forEach(file => {
        const dir = file.directory || '';
        if (!groupedFiles[dir]) {
            groupedFiles[dir] = [];
        }
        groupedFiles[dir].push(file);
    });
    
    // Sort directories to maintain hierarchy
    let directories = Object.keys(groupedFiles).sort((a, b) => {
        // Sort by path depth first (shallow paths first)
        const aDepth = a ? a.split('/').length : 0;
        const bDepth = b ? b.split('/').length : 0;
        
        if (aDepth !== bDepth) return aDepth - bDepth;
        
        // Then alphabetically
        return a.localeCompare(b);
    });
    
    console.log(`Found ${directories.length} directories to render`);
    
    let html = '';
    const renderedDirCount = Math.min(directories.length, 1000); // Safety limit for very large directory sets
    
    // Render in batches to prevent UI blocking
    for (let i = 0; i < renderedDirCount; i += RENDER_BATCH_SIZE) {
        const batch = directories.slice(i, i + RENDER_BATCH_SIZE);
        
        batch.forEach(directory => {
            const files = groupedFiles[directory];
            const dirName = directory.split('/').pop() || 'Root';
            const sanitizedDirId = `dir-${directory.replace(/[^a-zA-Z0-9]/g, '-')}`;
            const indentLevel = directory ? directory.split('/').length : 0;
            const indentStyle = `margin-left: ${indentLevel * 16}px`;
            
            html += `
                <div class="directory-group" style="${indentStyle}">
                    <div class="directory-header" onclick="toggleDirectory('${directory}')">
                        <span class="directory-icon">📁</span>
                        <span class="directory-name" title="${directory}">${dirName}</span>
                        <span class="file-count">(${files.length} files)</span>
                        <span class="expand-icon">▼</span>
                    </div>
                    <div class="directory-files expanded" id="${sanitizedDirId}">
                        ${files.map(file => renderFileItem(file)).join('')}
                    </div>
                </div>
            `;
        });
        
        // Update UI in batches to keep the interface responsive
        if (i % RENDER_BATCH_SIZE === 0) {
            await new Promise(resolve => setTimeout(resolve, 5));
        }
    }
    
    elements.fileTreeContainer.innerHTML = html;
    console.log("File tree rendering complete.");
}

// Virtual scrolling for very large lists
async function renderVirtualScrollList() {
    console.log(`Using virtual scrolling for ${filteredFiles.length} files`);
    const container = elements.fileTreeContainer;
    const itemHeight = 60; // Approximate height of each file item
    const containerHeight = 600; // Max height of container
    const visibleItems = Math.ceil(containerHeight / itemHeight);
    
    let scrollTop = 0;
    let startIndex = 0;
    const initialVisibleCount = Math.min(100, filteredFiles.length); // Show more files initially
    let endIndex = initialVisibleCount;
    
    // Group files by directory first for better organization
    const groupedFiles = {};
    filteredFiles.forEach(file => {
        const dir = file.directory || '';
        if (!groupedFiles[dir]) {
            groupedFiles[dir] = [];
        }
        groupedFiles[dir].push(file);
    });
    
    // Sort directories by hierarchy
    const directories = Object.keys(groupedFiles).sort((a, b) => {
        const aDepth = a ? a.split('/').length : 0;
        const bDepth = b ? b.split('/').length : 0;
        if (aDepth !== bDepth) return aDepth - bDepth;
        return a.localeCompare(b);
    });
    
    function renderVisibleItems() {
        const totalHeight = filteredFiles.length * itemHeight;
        
        let html = `
            <div class="virtual-scroll-container" style="height: ${Math.min(totalHeight, 5000)}px; overflow-y: auto;">
                <div class="virtual-scroll-info" style="position: sticky; top: 0; background: #f5f5f5; padding: 8px; border-bottom: 1px solid #ddd; z-index: 100;">
                    Showing files from ${filteredFiles.length} total files (scroll to load more)
                </div>
        `;
        
        // Render directory groups with their files
        let renderedFileCount = 0;
        let renderedDirCount = 0;
        
        for (const directory of directories) {
            if (renderedDirCount >= 100) break; // Safety limit for very large directory sets
            
            const files = groupedFiles[directory];
            if (!files || files.length === 0) continue;
            
            const dirName = directory.split('/').pop() || 'Root';
            const sanitizedDirId = `dir-${directory.replace(/[^a-zA-Z0-9]/g, '-')}`;
            const indentLevel = directory ? directory.split('/').length : 0;
            const indentStyle = `margin-left: ${indentLevel * 16}px`;
            
            html += `
                <div class="directory-group" style="${indentStyle}">
                    <div class="directory-header" onclick="toggleDirectory('${directory}')">
                        <span class="directory-icon">📁</span>
                        <span class="directory-name" title="${directory}">${dirName}</span>
                        <span class="file-count">(${files.length} files)</span>
                        <span class="expand-icon">▼</span>
                    </div>
                    <div class="directory-files expanded" id="${sanitizedDirId}">
            `;
            
            // Render files in this directory (up to a reasonable limit per directory)
            const filesToShow = files.slice(0, 500); // Allow up to 500 files per directory
            html += filesToShow.map(file => renderFileItem(file)).join('');
            
            if (files.length > 500) {
                html += `<div class="load-more-files" onclick="loadMoreFiles('${directory}')">
                    Load ${files.length - 500} more files in this directory...
                </div>`;
            }
            
            html += `
                    </div>
                </div>
            `;
            
            renderedFileCount += filesToShow.length;
            renderedDirCount++;
            
            if (renderedFileCount >= 1000) break; // Safety limit for initial render
        }
        
        html += `</div>`;
        container.innerHTML = html;
        
        // Add scroll event for loading more when near bottom
        const scrollContainer = container.querySelector('.virtual-scroll-container');
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', function() {
                if (this.scrollHeight - this.scrollTop - this.clientHeight < 200) {
                    // Near the bottom, load more directories if available
                    loadMoreDirectories();
                }
            });
        }
    }
    
    function loadMoreDirectories() {
        // This would be implemented to dynamically add more directories as user scrolls
        console.log("Would load more directories here as user scrolls");
    }
    
    renderVisibleItems();
}

// Load more files for a specific directory
function loadMoreFiles(directory) {
    console.log(`Loading more files for directory: ${directory}`);
    const dirElement = document.getElementById(`dir-${directory.replace(/[^a-zA-Z0-9]/g, '-')}`);
    if (!dirElement) {
        console.error(`Directory element not found for ${directory}`);
        return;
    }
    
    // Get all files for this directory
    const directoryFiles = filteredFiles.filter(file => file.directory === directory);
    
    // Get the current number of file elements
    const currentFileCount = dirElement.querySelectorAll('.file-item').length;
    console.log(`Current files: ${currentFileCount}, Total available: ${directoryFiles.length}`);
    
    // Get the "load more" button to replace it
    const moreButton = dirElement.querySelector('.load-more-files');
    if (!moreButton) {
        console.log("No load more button found");
        return;
    }
    
    // If we already have all files, exit
    if (currentFileCount >= directoryFiles.length) {
        console.log("All files already loaded");
        moreButton.remove();
        return;
    }
    
    // Calculate how many more files to show
    const remainingFiles = directoryFiles.slice(currentFileCount);
    const filesToAdd = remainingFiles.slice(0, 500); // Add up to 500 more files at a time
    
    // Create HTML for the new files
    const newFilesHtml = filesToAdd.map(file => renderFileItem(file)).join('');
    
    // Create new button HTML if needed
    const stillMoreFiles = currentFileCount + filesToAdd.length < directoryFiles.length;
    const newButtonHtml = stillMoreFiles 
        ? `<div class="load-more-files" onclick="loadMoreFiles('${directory}')">
            Load ${directoryFiles.length - currentFileCount - filesToAdd.length} more files...
          </div>`
        : '';
    
    // Replace the button with new files + possibly a new button
    moreButton.insertAdjacentHTML('beforebegin', newFilesHtml);
    
    if (stillMoreFiles) {
        moreButton.innerHTML = `Load ${directoryFiles.length - currentFileCount - filesToAdd.length} more files...`;
    } else {
        moreButton.remove();
    }
    
    console.log(`Added ${filesToAdd.length} more files to directory ${directory}`);
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
        showError('Failed to save data locally. Your dataset may be too large for browser storage.');
    }
}

// Efficient storage function for large datasets
function saveToLocalStorageLarge() {
    try {
        // Store metadata separately
        const metadata = {
            fileCount: allFiles.length,
            lastSaved: new Date().toISOString(),
            version: '1.2',
            chunkSize: 0
        };
        
        // Determine optimal chunk size based on file count
        let chunkSize = 500;
        if (allFiles.length < 5000) {
            chunkSize = 500;
        } else if (allFiles.length < 20000) {
            chunkSize = 1000;
        } else if (allFiles.length < 50000) {
            chunkSize = 2000;
        } else if (allFiles.length < 100000) {
            chunkSize = 3000;
        } else {
            chunkSize = 5000;
        }
        
        metadata.chunkSize = chunkSize;
        localStorage.setItem('javaTestTracker_meta', JSON.stringify(metadata));
        
        const totalChunks = Math.ceil(allFiles.length / chunkSize);
        
        // Clear any existing chunks first - use a more efficient approach
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('javaTestTracker_chunk_')) {
                keysToRemove.push(key);
            }
        }
        
        // Batch remove keys to improve performance
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Show progress for large datasets
        const showSaveProgress = totalChunks > 10;
        let lastProgressUpdate = Date.now();
        
        // Store new chunks with optimized serialization
        for (let i = 0; i < totalChunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, allFiles.length);
            const chunk = allFiles.slice(start, end);
            
            try {
                localStorage.setItem(`javaTestTracker_chunk_${i}`, JSON.stringify(chunk));
                
                // Show progress update for large datasets (but not too frequently)
                if (showSaveProgress && (i % 5 === 0 || i === totalChunks - 1) && 
                    Date.now() - lastProgressUpdate > 300) {
                    const saveProgress = Math.round((i + 1) / totalChunks * 100);
                    updateProgress(
                        85 + (saveProgress / 100) * 5, 
                        `Saving data: ${saveProgress}%`,
                        `Chunk ${i + 1}/${totalChunks}`
                    );
                    lastProgressUpdate = Date.now();
                }
            } catch (chunkError) {
                console.error(`Error saving chunk ${i}:`, chunkError);
                
                // Try saving a smaller chunk if possible
                if (chunk.length > 200) {
                    const halfChunkSize = Math.floor(chunk.length / 2);
                    try {
                        localStorage.setItem(`javaTestTracker_chunk_${i}_p1`, 
                            JSON.stringify(chunk.slice(0, halfChunkSize)));
                        localStorage.setItem(`javaTestTracker_chunk_${i}_p2`, 
                            JSON.stringify(chunk.slice(halfChunkSize)));
                        console.log(`Split chunk ${i} into smaller pieces`);
                    } catch (splitError) {
                        console.error(`Failed to save split chunks for ${i}:`, splitError);
                        throw new Error(`Storage quota exceeded. Could only save ${i * chunkSize} of ${allFiles.length} files.`);
                    }
                } else {
                    throw chunkError; // Re-throw if chunks are already small
                }
            }
        }
        
        console.log(`Saved ${allFiles.length} files in ${totalChunks} chunks`);
        showSuccess(`Successfully saved ${allFiles.length} files to local storage`);
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        showError('Failed to save all data: ' + error.message);
        return false;
    }
    return true;
}

function loadFromLocalStorage() {
    try {
        // Show loading indicator for potentially large datasets
        showProgressModal();
        updateProgress(0, 'Loading saved data...', 'Checking for saved files');
        
        // First try the standard storage format
        const data = localStorage.getItem('javaTestTracker');
        if (data) {
            updateProgress(10, 'Loading from standard storage...', 'Parsing data');
            const parsed = JSON.parse(data);
            allFiles = parsed.files || [];
            console.log(`Loaded ${allFiles.length} files from standard storage`);
            updateProgress(100, 'Loading complete!', `Loaded ${allFiles.length} files`);
        } 
        // If not found, try the chunked format
        else {
            const metaData = localStorage.getItem('javaTestTracker_meta');
            if (metaData) {
                const meta = JSON.parse(metaData);
                updateProgress(10, 'Loading from chunked storage...', `Found ${meta.fileCount} files`);
                console.log(`Found chunked storage with ${meta.fileCount} files`);
                
                // Pre-allocate array for better performance with very large datasets
                const estimatedFileCount = meta.fileCount || 10000;
                allFiles = [];
                
                // Load all chunks
                let chunkIndex = 0;
                let continueLoading = true;
                const startTime = Date.now();
                
                while (continueLoading) {
                    // Try regular chunk first
                    let chunkData = localStorage.getItem(`javaTestTracker_chunk_${chunkIndex}`);
                    
                    if (chunkData) {
                        try {
                            const chunkFiles = JSON.parse(chunkData);
                            allFiles.push(...chunkFiles);
                            
                            // Update progress for large datasets
                            if (meta.fileCount > 0) {
                                const progressPct = Math.min(90, 10 + (allFiles.length / meta.fileCount * 80));
                                if (chunkIndex % 2 === 0 || allFiles.length >= meta.fileCount) {
                                    updateProgress(
                                        progressPct, 
                                        `Loading chunk ${chunkIndex + 1}...`, 
                                        `Loaded ${allFiles.length} of ${meta.fileCount} files`,
                                        `Elapsed: ${formatTime(Date.now() - startTime)}`
                                    );
                                }
                            }
                            chunkIndex++;
                            
                        } catch (parseError) {
                            console.error(`Error parsing chunk ${chunkIndex}:`, parseError);
                            chunkIndex++; // Skip this chunk
                        }
                    } 
                    // Try split chunks if regular chunk not found
                    else {
                        const part1 = localStorage.getItem(`javaTestTracker_chunk_${chunkIndex}_p1`);
                        const part2 = localStorage.getItem(`javaTestTracker_chunk_${chunkIndex}_p2`);
                        
                        if (part1 && part2) {
                            try {
                                const chunkFiles1 = JSON.parse(part1);
                                const chunkFiles2 = JSON.parse(part2);
                                allFiles.push(...chunkFiles1, ...chunkFiles2);
                                chunkIndex++;
                            } catch (splitParseError) {
                                console.error(`Error parsing split chunk ${chunkIndex}:`, splitParseError);
                                chunkIndex++; // Skip this chunk
                            }
                        } else {
                            continueLoading = false; // No more chunks
                        }
                    }
                    
                    // Safety check to prevent infinite loops
                    if (chunkIndex > 1000) {
                        console.warn('Too many chunks, stopping load');
                        break;
                    }
                }
                
                console.log(`Finished loading ${allFiles.length} files from chunked storage`);
                updateProgress(95, 'Loading complete!', `Loaded ${allFiles.length} files`);
            } else {
                // No saved data
                updateProgress(100, 'No saved data found', 'Starting fresh');
                setTimeout(() => hideProgressModal(), 500);
                return;
            }
        }
        
        // Only proceed with building the UI if we have files
        if (allFiles.length > 0) {
            updateProgress(97, 'Building folder structure...', 'Organizing files');
            // We'll use setTimeout to allow the progress bar to update
            setTimeout(async () => {
                await buildFolderStructureOptimized();
                updateStatistics();
                updateProgress(100, 'Loading complete!', `Ready with ${allFiles.length} files`);
                setTimeout(() => hideProgressModal(), 500);
            }, 10);
        } else {
            hideProgressModal();
        }
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        hideProgressModal();
        showError('Failed to load saved data. Starting with empty state.');
        allFiles = [];
    }
}

// Data management functions
function exportData() {
    const data = {
        files: allFiles,
        developerAssignments: developerAssignments,
        exportDate: new Date().toISOString(),
        version: '1.1'
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
                
                // Import developer assignments if available
                if (data.developerAssignments && typeof data.developerAssignments === 'object') {
                    developerAssignments = data.developerAssignments;
                    saveDeveloperAssignments();
                }
                
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
        developerAssignments = {};
        
        localStorage.removeItem('javaTestTracker');
        localStorage.removeItem('javaDeveloperAssignments');
        
        buildFolderStructureOptimized();
        updateStatistics();
        updateUI();
        filterAndRenderFiles();
        
        showSuccess('All data cleared successfully!');
    }
}

// Progress Modal Functions
function showProgressModal() {
    try {
        const progressModal = document.getElementById('progressModal');
        if (!progressModal) {
            console.error("Progress modal element not found in DOM");
            return;
        }
        
        progressModal.style.display = 'block';
        
        // Reset progress state
        updateProgress(0, 'Starting...', 'Initializing file processing...');
        
        console.log("Progress modal shown");
    } catch (error) {
        console.error("Error showing progress modal:", error);
    }
}

function hideProgressModal() {
    try {
        const progressModal = document.getElementById('progressModal');
        if (!progressModal) {
            console.error("Progress modal element not found in DOM");
            return;
        }
        
        // Use a shorter timeout to avoid blocking the UI
        setTimeout(() => {
            try {
                progressModal.style.display = 'none';
                console.log("Progress modal hidden");
            } catch (err) {
                console.error("Error hiding progress modal:", err);
            }
        }, 500);
    } catch (error) {
        console.error("Error in hideProgressModal:", error);
    }
}

// Enhanced progress modal with performance metrics
function updateProgress(percentage, mainText, subText = '', timeEstimate = '') {
    try {
        const modal = document.getElementById('progressModal');
        if (!modal) {
            console.error("Progress modal not found for updating progress");
            return;
        }
        
        // Progress bar could be in different elements depending on HTML version
        const progressBar = modal.querySelector('.progress-fill') || 
                           modal.querySelector('.progress-bar');
        
        // Progress percentage element
        const progressPercentageEl = modal.querySelector('#progressPercentage');
        
        // Try multiple selectors for each element type to handle both HTML versions
        // Status text elements
        const statusTextElements = [
            modal.querySelector('#progressStatus'),
            modal.querySelector('.progress-status'),
            modal.querySelector('#progressTitle'),
            modal.querySelector('.progress-main-text')
        ].filter(Boolean); // Remove null/undefined entries
        
        // Message elements 
        const messageElements = [
            modal.querySelector('#progressMessage'),
            modal.querySelector('.progress-sub-text'),
            modal.querySelector('#progressStats')
        ].filter(Boolean);

        // Stats/time estimate elements
        const statsElements = [
            modal.querySelector('#progressTimeEstimate'),
            modal.querySelector('.progress-time-estimate'),
            modal.querySelector('#progressStats'),
            modal.querySelector('.progress-stats')
        ].filter(Boolean);
        
        // Percentage display
        const percentageElements = [
            progressPercentageEl,
            modal.querySelector('#progressPercentage'),
            modal.querySelector('.progress-percentage')
        ].filter(Boolean);
        
        // Validate percentage is a number
        if (isNaN(percentage)) {
            console.warn("Invalid percentage passed to updateProgress:", percentage);
            percentage = 0;
        }
        
        // For very large file uploads, add memory usage info if available
        if (performance && performance.memory && percentage > 0 && percentage < 100) {
            const memoryInfo = `Memory: ${Math.round(performance.memory.usedJSHeapSize / 1048576)} MB / ${Math.round(performance.memory.jsHeapSizeLimit / 1048576)} MB`;
            if (timeEstimate) {
                timeEstimate = `${timeEstimate} | ${memoryInfo}`;
            } else {
                timeEstimate = memoryInfo;
            }
        }
        
        // Cap percentage between 0 and 100
        percentage = Math.max(0, Math.min(100, percentage));
        
        // Update UI with verbose error handling
        if (progressBar) {
            progressBar.style.width = percentage + '%';
        } else {
            console.warn("Progress bar element not found in modal");
        }
        
        // Update percentage text displays
        percentageElements.forEach(el => {
            if (el) el.textContent = `${Math.round(percentage)}%`;
        });
        
        // Update all status text elements
        statusTextElements.forEach(el => {
            if (el) el.textContent = mainText || '';
        });
        
        // Update all message elements
        messageElements.forEach(el => {
            if (el) el.textContent = subText || '';
        });
        
        // Update all stats/time elements
        statsElements.forEach(el => {
            if (el) el.textContent = timeEstimate || '';
        });
        
        // Update performance metrics
        if (percentage === 0) {
            performanceMetrics.startTime = Date.now();
            console.log("Starting performance tracking");
        }
        
        // Log progress at key points
        if (percentage % 25 === 0) {
            console.log(`Progress update: ${percentage}% - ${mainText}`);
        }
    } catch (error) {
        console.error("Error updating progress:", error);
    }
}

// Helper function to show success message
function showSuccess(message) {
    if (!message) return;
    
    const existingToast = document.getElementById('toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = 'toast-notification success';
    toast.innerHTML = `
        <div class="toast-icon">✓</div>
        <div class="toast-message">${message}</div>
    `;
    document.body.appendChild(toast);
    
    // Automatically remove after 5 seconds
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 5000);
}

// Helper function to show error message
function showError(message) {
    if (!message) return;
    
    const existingToast = document.getElementById('toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = 'toast-notification error';
    toast.innerHTML = `
        <div class="toast-icon">⚠️</div>
        <div class="toast-message">${message}</div>
    `;
    document.body.appendChild(toast);
    
    // Automatically remove after 10 seconds for errors
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 10000);
}

// Format time in human-readable format
function formatTime(milliseconds) {
    if (milliseconds < 1000) return `${milliseconds}ms`;
    
    const seconds = Math.floor(milliseconds / 1000);
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
}

// Performance analysis and reporting
function reportPerformanceMetrics(totalFiles, processingTime, renderTime) {
    const totalTime = processingTime + renderTime;
    const filesPerSecond = Math.round(totalFiles / (totalTime / 1000));
    
    console.log(`📊 Performance Report for ${totalFiles} files:`);
    console.log(`⏱️ Processing Time: ${formatTime(processingTime)}`);
    console.log(`🎨 Rendering Time: ${formatTime(renderTime)}`);
    console.log(`⚡ Total Time: ${formatTime(totalTime)}`);
    console.log(`📈 Throughput: ${filesPerSecond} files/second`);
    
    // Show user-friendly summary for large datasets
    if (totalFiles > 10000) {
        const notification = document.createElement('div');
        notification.className = 'performance-notification';
        notification.innerHTML = `

            <div class="perf-summary">
                <strong>✅ Processing Complete!</strong><br>
                Processed ${totalFiles.toLocaleString()} files in ${formatTime(totalTime)}<br>
                <small>Performance: ${filesPerSecond} files/second</small>
            </div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 8000);
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

// Tree control functions
function expandAllFolders() {
    const allChildren = document.querySelectorAll('.tree-children');
    allChildren.forEach(child => {
        child.classList.add('expanded');
    });
}

function collapseAllFolders() {
    const allChildren = document.querySelectorAll('.tree-children');
    allChildren.forEach(child => {
        child.classList.remove('expanded');
    });
}

function selectAllFolders() {
    // Get all folder paths from the folder structure
    const allPaths = getAllFolderPaths(folderStructure, '');
    allPaths.forEach(path => {
        selectedFolders.add(path);
    });
    
    // Update checkboxes
    const allCheckboxes = document.querySelectorAll('.tree-checkbox');
    allCheckboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
    
    // Update active states
    const allFolders = document.querySelectorAll('.tree-folder');
    allFolders.forEach(folder => {
        folder.classList.add('active');
    });
    
    filterAndRenderFiles();
}

function deselectAllFolders() {
    selectedFolders.clear();
    
    // Update checkboxes
    const allCheckboxes = document.querySelectorAll('.tree-checkbox');
    allCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Update active states
    const allFolders = document.querySelectorAll('.tree-folder');
    allFolders.forEach(folder => {
        folder.classList.remove('active');
    });
    
    filterAndRenderFiles();
}

// Helper function to get all folder paths recursively
function getAllFolderPaths(structure, parentPath) {
    let paths = [];
    
    Object.keys(structure).forEach(folderName => {
        const fullPath = parentPath ? `${parentPath}/${folderName}` : folderName;
        paths.push(fullPath);
        
        // Recursively get subfolders
        const subPaths = getAllFolderPaths(structure[folderName].subfolders, fullPath);
        paths = paths.concat(subPaths);
    });
    
    return paths;
}

// Developer assignment management
function updateDeveloperAssignment(folderPath, developerName) {
    if (developerName.trim()) {
        developerAssignments[folderPath] = developerName.trim();
    } else {
        delete developerAssignments[folderPath];
    }
    
    // Save to localStorage
    saveDeveloperAssignments();
}

function saveDeveloperAssignments() {
    try {
        localStorage.setItem('javaDeveloperAssignments', JSON.stringify(developerAssignments));
    } catch (error) {
        console.error('Error saving developer assignments:', error);
    }
}

function loadDeveloperAssignments() {
    try {
        const data = localStorage.getItem('javaDeveloperAssignments');
        if (data) {
            developerAssignments = JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading developer assignments:', error);
        developerAssignments = {};
    }
}

// Make functions globally available for onclick handlers
window.toggleFolder = toggleFolder;
window.toggleFolderSelection = toggleFolderSelection;
window.toggleDirectory = toggleDirectory;
window.openFileModal = openFileModal;
window.loadMoreFiles = loadMoreFiles;
window.updateDeveloperAssignment = updateDeveloperAssignment;
