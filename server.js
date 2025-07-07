const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Data file path
const DATA_FILE = path.join(__dirname, 'data', 'java-files.json');

// Initialize data file if it doesn't exist
async function initializeData() {
    try {
        await fs.ensureDir(path.dirname(DATA_FILE));
        if (!await fs.pathExists(DATA_FILE)) {
            await fs.writeJson(DATA_FILE, {
                lastScan: null,
                totalFiles: 0,
                completedTests: 0,
                completedDocs: 0,
                files: []
            });
        }
    } catch (error) {
        console.error('Error initializing data:', error);
    }
}

// Get all Java files data
app.get('/api/files', async (req, res) => {
    try {
        const data = await fs.readJson(DATA_FILE);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read data' });
    }
});

// Update file status
app.put('/api/files/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { testCompleted, docCompleted, notes } = req.body;
        
        const data = await fs.readJson(DATA_FILE);
        const fileIndex = data.files.findIndex(f => f.id === id);
        
        if (fileIndex === -1) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        const file = data.files[fileIndex];
        
        // Check if this is a manual override
        const manualTestOverride = testCompleted !== file.autoDetectedTest ? testCompleted : undefined;
        const manualDocOverride = docCompleted !== file.autoDetectedDoc ? docCompleted : undefined;
        
        data.files[fileIndex] = {
            ...file,
            testCompleted: testCompleted,
            docCompleted: docCompleted,
            notes: notes || '',
            lastUpdated: new Date().toISOString(),
            manualTestOverride: manualTestOverride,
            manualDocOverride: manualDocOverride
        };
        
        // Update counters
        data.completedTests = data.files.filter(f => f.testCompleted).length;
        data.completedDocs = data.files.filter(f => f.docCompleted).length;
        
        await fs.writeJson(DATA_FILE, data, { spaces: 2 });
        res.json(data.files[fileIndex]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update file' });
    }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
    try {
        const data = await fs.readJson(DATA_FILE);
        const stats = {
            totalFiles: data.totalFiles,
            completedTests: data.completedTests,
            completedDocs: data.completedDocs,
            testProgress: data.totalFiles > 0 ? (data.completedTests / data.totalFiles * 100).toFixed(1) : 0,
            docProgress: data.totalFiles > 0 ? (data.completedDocs / data.totalFiles * 100).toFixed(1) : 0,
            lastScan: data.lastScan
        };
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, async () => {
    await initializeData();
    console.log(`Java Unit Test Tracker running on http://localhost:${PORT}`);
    console.log('Run "npm run scan" to scan for Java files first');
});
