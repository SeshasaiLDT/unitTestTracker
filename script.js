class JavaTestTracker {
    constructor() {
        this.files = [];
        this.currentFile = null;
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.updateUI();
    }

    setupEventListeners() {
        // File input handlers
        document.getElementById('folderInput').addEventListener('change', (e) => this.handleFileUpload(e));
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileUpload(e));
        
        // Data management
        document.getElementById('exportData').addEventListener('click', () => this.exportData());
        document.getElementById('importData').addEventListener('change', (e) => this.importData(e));
        document.getElementById('clearData').addEventListener('click', () => this.clearData());
        
        // Search and filters
        document.getElementById('searchInput').addEventListener('input', (e) => this.filterFiles());
        document.getElementById('showIncomplete').addEventListener('change', () => this.filterFiles());
        document.getElementById('showCompleted').addEventListener('change', () => this.filterFiles());
        document.getElementById('showAutoDetected').addEventListener('change', () => this.filterFiles());
        document.getElementById('sortBy').addEventListener('change', () => this.filterFiles());
        
        // Modal handlers
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        document.getElementById('saveChanges').addEventListener('click', () => this.saveFileChanges());
        document.getElementById('cancelChanges').addEventListener('click', () => this.closeModal());
        
        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('fileModal')) {
                this.closeModal();
            }
        });
    }

    async handleFileUpload(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        document.getElementById('loading').style.display = 'block';
        document.getElementById('welcomeMessage').style.display = 'none';

        try {
            await this.processFiles(files);
            this.updateUI();
            this.saveData();
        } catch (error) {
            console.error('Error processing files:', error);
            alert('Error processing files. Please try again.');
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    }

    async processFiles(files) {
        const javaFiles = files.filter(file => file.name.endsWith('.java'));
        const allFiles = new Map();
        
        // Create a map of all files for cross-reference
        files.forEach(file => {
            const relativePath = file.webkitRelativePath || file.name;
            allFiles.set(relativePath, file);
        });

        // Process each Java file
        for (const javaFile of javaFiles) {
            const relativePath = javaFile.webkitRelativePath || javaFile.name;
            const directory = relativePath.includes('/') ? relativePath.substring(0, relativePath.lastIndexOf('/')) : '';
            const baseName = javaFile.name.replace('.java', '');
            
            // Look for corresponding test and documentation files
            const testFileName = `${baseName}_tests.java`;
            const docFileName = `${baseName}.pdf`;
            
            const testFilePath = directory ? `${directory}/${testFileName}` : testFileName;
            const docFilePath = directory ? `${directory}/${docFileName}` : docFileName;
            
            const testExists = allFiles.has(testFilePath);
            const docExists = allFiles.has(docFilePath);

            // Check if file already exists in our data
            const existingFile = this.files.find(f => f.relativePath === relativePath);
            
            if (existingFile) {
                // Update existing file with new auto-detection results
                existingFile.autoDetectedTest = testExists;
                existingFile.autoDetectedDoc = docExists;
                existingFile.testFile = testExists ? testFilePath : null;
                existingFile.docFile = docExists ? docFilePath : null;
                
                // Update completion status if no manual override
                if (existingFile.manualTestOverride === undefined) {
                    existingFile.testCompleted = testExists;
                }
                if (existingFile.manualDocOverride === undefined) {
                    existingFile.docCompleted = docExists;
                }
            } else {
                // Add new file
                const fileData = {
                    id: this.generateId(relativePath),
                    name: javaFile.name,
                    relativePath: relativePath,
                    directory: directory,
                    testCompleted: testExists,
                    docCompleted: docExists,
                    autoDetectedTest: testExists,
                    autoDetectedDoc: docExists,
                    testFile: testExists ? testFilePath : null,
                    docFile: docExists ? docFilePath : null,
                    notes: '',
                    lastUpdated: null,
                    createdAt: new Date().toISOString(),
                    manualTestOverride: undefined,
                    manualDocOverride: undefined
                };
                
                this.files.push(fileData);
            }
        }
    }

    generateId(relativePath) {
        return btoa(relativePath).replace(/[^a-zA-Z0-9]/g, '');
    }

    updateUI() {
        this.updateStats();
        this.filterFiles();
        
        // Update scan info
        document.getElementById('lastScan').textContent = 
            this.files.length > 0 ? `Last updated: ${new Date().toLocaleString()}` : 'No files loaded';
        document.getElementById('fileCount').textContent = `${this.files.length} files`;
        
        // Show/hide welcome message
        document.getElementById('welcomeMessage').style.display = 
            this.files.length === 0 ? 'block' : 'none';
    }

    updateStats() {
        const totalFiles = this.files.length;
        const completedTests = this.files.filter(f => f.testCompleted).length;
        const completedDocs = this.files.filter(f => f.docCompleted).length;
        
        document.getElementById('totalFiles').textContent = totalFiles;
        document.getElementById('completedTests').textContent = completedTests;
        document.getElementById('completedDocs').textContent = completedDocs;
        
        const testProgress = totalFiles > 0 ? (completedTests / totalFiles * 100) : 0;
        const docProgress = totalFiles > 0 ? (completedDocs / totalFiles * 100) : 0;
        
        document.getElementById('testProgress').style.width = `${testProgress}%`;
        document.getElementById('docProgress').style.width = `${docProgress}%`;
        document.getElementById('testProgressText').textContent = `${testProgress.toFixed(1)}%`;
        document.getElementById('docProgressText').textContent = `${docProgress.toFixed(1)}%`;
    }

    filterFiles() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const showIncomplete = document.getElementById('showIncomplete').checked;
        const showCompleted = document.getElementById('showCompleted').checked;
        const showAutoDetected = document.getElementById('showAutoDetected').checked;
        const sortBy = document.getElementById('sortBy').value;

        let filteredFiles = this.files.filter(file => {
            // Search filter
            if (searchTerm && !file.name.toLowerCase().includes(searchTerm) && 
                !file.relativePath.toLowerCase().includes(searchTerm)) {
                return false;
            }

            // Completion filter
            const isCompleted = file.testCompleted && file.docCompleted;
            const isIncomplete = !file.testCompleted || !file.docCompleted;
            
            if (!showCompleted && isCompleted) return false;
            if (!showIncomplete && isIncomplete) return false;
            
            // Auto-detected filter
            if (!showAutoDetected && (file.autoDetectedTest || file.autoDetectedDoc)) {
                return false;
            }

            return true;
        });

        // Sort files
        filteredFiles.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'path':
                    return a.relativePath.localeCompare(b.relativePath);
                case 'status':
                    const aCompleted = (a.testCompleted ? 1 : 0) + (a.docCompleted ? 1 : 0);
                    const bCompleted = (b.testCompleted ? 1 : 0) + (b.docCompleted ? 1 : 0);
                    return bCompleted - aCompleted;
                default:
                    return 0;
            }
        });

        this.renderFiles(filteredFiles);
    }

    renderFiles(files) {
        const grid = document.getElementById('filesGrid');
        
        if (files.length === 0) {
            grid.innerHTML = '<div class="no-files-message">No files match your current filters</div>';
            return;
        }

        grid.innerHTML = files.map(file => `
            <div class="file-item" data-id="${file.id}">
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-path">${file.relativePath}</div>
                    ${file.notes ? `<div class="file-notes">📝 ${file.notes}</div>` : ''}
                </div>
                <div class="file-status">
                    <div class="status-badges">
                        ${this.getStatusBadge('Test', file.testCompleted, file.autoDetectedTest, file.manualTestOverride !== undefined)}
                        ${this.getStatusBadge('Doc', file.docCompleted, file.autoDetectedDoc, file.manualDocOverride !== undefined)}
                    </div>
                    <div class="file-actions">
                        <button class="edit-btn" onclick="tracker.openFileModal('${file.id}')">✏️</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getStatusBadge(type, completed, autoDetected, manualOverride) {
        let className = 'status-badge';
        let text = type;
        let icon = '';

        if (completed) {
            className += ' completed';
            icon = '✅';
        } else {
            className += ' pending';
            icon = '⏳';
        }

        if (autoDetected && !manualOverride) {
            className += ' auto-detected';
            icon += '🔍';
        }

        if (manualOverride) {
            className += ' manual-override';
            icon += '👤';
        }

        return `<span class="${className}">${icon} ${text}</span>`;
    }

    openFileModal(fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (!file) return;

        this.currentFile = file;
        
        // Populate modal
        document.getElementById('modalTitle').textContent = file.name;
        document.getElementById('modalFileName').textContent = file.name;
        document.getElementById('modalPath').textContent = file.relativePath;
        document.getElementById('modalDirectory').textContent = file.directory || 'Root';
        
        // Auto-detection info
        document.getElementById('modalTestFile').textContent = file.testFile || 'Not found';
        document.getElementById('modalDocFile').textContent = file.docFile || 'Not found';
        
        document.getElementById('modalTestStatus').textContent = file.autoDetectedTest ? '✅ Found' : '❌ Not found';
        document.getElementById('modalDocStatus').textContent = file.autoDetectedDoc ? '✅ Found' : '❌ Not found';
        
        // Current status
        document.getElementById('modalTestCompleted').checked = file.testCompleted;
        document.getElementById('modalDocCompleted').checked = file.docCompleted;
        document.getElementById('modalNotes').value = file.notes || '';
        
        // Show modal
        document.getElementById('fileModal').style.display = 'block';
    }

    closeModal() {
        document.getElementById('fileModal').style.display = 'none';
        this.currentFile = null;
    }

    saveFileChanges() {
        if (!this.currentFile) return;

        const testCompleted = document.getElementById('modalTestCompleted').checked;
        const docCompleted = document.getElementById('modalDocCompleted').checked;
        const notes = document.getElementById('modalNotes').value;

        // Update file data
        this.currentFile.testCompleted = testCompleted;
        this.currentFile.docCompleted = docCompleted;
        this.currentFile.notes = notes;
        this.currentFile.lastUpdated = new Date().toISOString();

        // Set manual overrides
        this.currentFile.manualTestOverride = testCompleted !== this.currentFile.autoDetectedTest ? testCompleted : undefined;
        this.currentFile.manualDocOverride = docCompleted !== this.currentFile.autoDetectedDoc ? docCompleted : undefined;

        this.updateUI();
        this.saveData();
        this.closeModal();
    }

    exportData() {
        const data = {
            exportDate: new Date().toISOString(),
            version: '1.0',
            files: this.files
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `java-test-tracker-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.files = data.files || [];
                this.updateUI();
                this.saveData();
                alert('Data imported successfully!');
            } catch (error) {
                alert('Error importing data. Please check the file format.');
            }
        };
        reader.readAsText(file);
    }

    clearData() {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            this.files = [];
            this.updateUI();
            this.saveData();
        }
    }

    saveData() {
        localStorage.setItem('javaTestTracker', JSON.stringify(this.files));
    }

    loadData() {
        const saved = localStorage.getItem('javaTestTracker');
        if (saved) {
            this.files = JSON.parse(saved);
        }
    }
}

// Initialize the tracker when the page loads
let tracker;
document.addEventListener('DOMContentLoaded', () => {
    tracker = new JavaTestTracker();
});
