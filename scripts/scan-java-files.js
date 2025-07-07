const fs = require('fs-extra');
const path = require('path');

// Configuration - Update this path to your Java project directory
const JAVA_PROJECT_PATH = process.argv[2] || 'C:\\path\\to\\your\\java\\project';
const DATA_FILE = path.join(__dirname, '..', 'data', 'java-files.json');

console.log('🔍 Scanning Java files...');
console.log('Project path:', JAVA_PROJECT_PATH);

// Function to recursively find all Java files and related files
async function findJavaFiles(dir, basePath = '') {
    const files = [];
    const allFiles = new Map(); // Store all files for cross-reference
    
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        // First pass: collect all files
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.join(basePath, entry.name);
            
            if (entry.isDirectory()) {
                // Skip common non-source directories
                if (!['node_modules', '.git', 'target', 'build', 'dist', '.idea'].includes(entry.name)) {
                    const subFiles = await findJavaFiles(fullPath, relativePath);
                    files.push(...subFiles);
                }
            } else if (entry.isFile()) {
                allFiles.set(relativePath, {
                    name: entry.name,
                    relativePath: relativePath,
                    fullPath: fullPath,
                    directory: path.dirname(relativePath) || '.'
                });
            }
        }
        
        // Second pass: process Java files and check for corresponding test/doc files
        for (const [relativePath, fileInfo] of allFiles) {
            if (fileInfo.name.endsWith('.java')) {
                const baseName = fileInfo.name.replace('.java', '');
                const testFileName = `${baseName}_tests.java`;
                const docFileName = `${baseName}.pdf`;
                
                // Check if test file exists in the same directory
                const testFilePath = path.join(fileInfo.directory, testFileName);
                const docFilePath = path.join(fileInfo.directory, docFileName);
                
                const testExists = allFiles.has(testFilePath);
                const docExists = allFiles.has(docFilePath);
                
                files.push({
                    id: generateId(relativePath),
                    name: fileInfo.name,
                    relativePath: relativePath,
                    fullPath: fileInfo.fullPath,
                    directory: fileInfo.directory,
                    testCompleted: testExists,
                    docCompleted: docExists,
                    testFile: testExists ? testFilePath : null,
                    docFile: docExists ? docFilePath : null,
                    notes: '',
                    lastUpdated: null,
                    createdAt: new Date().toISOString()
                });
            }
        }
    } catch (error) {
        console.error(`Error scanning directory ${dir}:`, error.message);
    }
    
    return files;
}

// Generate unique ID for file
function generateId(filePath) {
    return Buffer.from(filePath).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
}

// Main scanning function
async function scanJavaFiles() {
    try {
        // Check if Java project path exists
        if (!await fs.pathExists(JAVA_PROJECT_PATH)) {
            console.error('❌ Java project path does not exist:', JAVA_PROJECT_PATH);
            console.log('Usage: npm run scan [path-to-java-project]');
            console.log('Example: npm run scan "C:\\MyProject\\src"');
            return;
        }
        
        console.log('📁 Scanning directory:', JAVA_PROJECT_PATH);
        
        const javaFiles = await findJavaFiles(JAVA_PROJECT_PATH);
        
        console.log(`✅ Found ${javaFiles.length} Java files`);
        
        // Load existing data to preserve completion status
        let existingData = {
            files: []
        };
        
        if (await fs.pathExists(DATA_FILE)) {
            existingData = await fs.readJson(DATA_FILE);
        }
        
        // Merge with existing data
        const existingFilesMap = new Map(existingData.files.map(f => [f.id, f]));
        
        const mergedFiles = javaFiles.map(file => {
            const existing = existingFilesMap.get(file.id);
            if (existing) {
                // Preserve manual overrides, but update automatic detection
                // If user manually unchecked but file exists, keep manual choice
                // If user didn't manually override, use automatic detection
                return {
                    ...file,
                    testCompleted: existing.manualTestOverride !== undefined ? existing.manualTestOverride : file.testCompleted,
                    docCompleted: existing.manualDocOverride !== undefined ? existing.manualDocOverride : file.docCompleted,
                    notes: existing.notes,
                    lastUpdated: existing.lastUpdated,
                    manualTestOverride: existing.manualTestOverride,
                    manualDocOverride: existing.manualDocOverride,
                    autoDetectedTest: file.testCompleted,
                    autoDetectedDoc: file.docCompleted
                };
            }
            return {
                ...file,
                autoDetectedTest: file.testCompleted,
                autoDetectedDoc: file.docCompleted
            };
        });
        
        // Create updated data
        const updatedData = {
            lastScan: new Date().toISOString(),
            totalFiles: mergedFiles.length,
            completedTests: mergedFiles.filter(f => f.testCompleted).length,
            completedDocs: mergedFiles.filter(f => f.docCompleted).length,
            files: mergedFiles
        };
        
        // Ensure data directory exists
        await fs.ensureDir(path.dirname(DATA_FILE));
        
        // Save data
        await fs.writeJson(DATA_FILE, updatedData, { spaces: 2 });
        
        console.log('📊 Scan Results:');
        console.log(`   Total Java files: ${updatedData.totalFiles}`);
        console.log(`   Tests completed: ${updatedData.completedTests}`);
        console.log(`   Docs completed: ${updatedData.completedDocs}`);
        console.log(`   Data saved to: ${DATA_FILE}`);
        
        // Show some sample files
        console.log('\n📋 Sample files found:');
        mergedFiles.slice(0, 5).forEach(file => {
            console.log(`   ${file.relativePath}`);
        });
        
        if (mergedFiles.length > 5) {
            console.log(`   ... and ${mergedFiles.length - 5} more files`);
        }
        
        console.log('\n🚀 Run "npm start" to launch the web interface');
        
    } catch (error) {
        console.error('❌ Error during scan:', error);
    }
}

// Run if called directly
if (require.main === module) {
    scanJavaFiles();
}

module.exports = { scanJavaFiles };
