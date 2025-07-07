# Java Unit Test Tracker - GitHub Pages Version

A client-side web application for tracking unit test and documentation completion across Java codebases. This version runs entirely in the browser without requiring any server setup.

## 🚀 Features

- **Automatic File Detection**: Upload your Java project and automatically detect:
  - Java source files (`.java`)
  - Unit test files (follows naming pattern: `ClassName_tests.java`)
  - Documentation files (follows naming pattern: `ClassName.pdf`)

- **Smart Status Tracking**: 
  - Auto-checks completion status when corresponding files are found
  - Manual override capability for any file
  - Visual indicators for auto-detected vs manually set statuses

- **Team Collaboration**:
  - Export/import data as JSON files
  - Share progress with team members
  - Local storage for persistence between sessions

- **Enhanced UI**:
  - Real-time search and filtering
  - Progress tracking with visual indicators
  - Detailed file information in modal dialogs
  - Responsive design for mobile/desktop

## 🎯 How It Works

1. **Upload Files**: Select your Java project folder or individual files
2. **Auto-Detection**: The app automatically looks for corresponding test and doc files
3. **Track Progress**: Files with existing tests/docs are automatically marked complete
4. **Manual Override**: You can manually check/uncheck any file regardless of auto-detection
5. **Export/Share**: Export your progress data to share with team members

## 📋 File Naming Conventions

- **Java files**: `ClassName.java`
- **Test files**: `ClassName_tests.java` (automatically detected)
- **Documentation**: `ClassName.pdf` (automatically detected)
   ```bash
   npm run scan "C:\MyProject\src\main\java"
   ```

4. **Start the web server**:
   ```bash
   npm start
   ```

5. **Open your browser** and go to:
## 🔧 Usage

### Local Development
1. Open `index.html` in your web browser
2. Upload your Java project files
3. Start tracking your progress!

### GitHub Pages Deployment
1. Fork this repository
2. Enable GitHub Pages in repository settings
3. Your tracker will be available at `https://yourusername.github.io/java-test-tracker/`

## 📊 Data Management

### Export Data
- Click "Export Data" to download your progress as a JSON file
- Share this file with team members

### Import Data
- Click "Import Data" to load previously exported progress
- Merges with existing data

### Clear Data
- Removes all tracked files and progress
- Use with caution - this cannot be undone

## 🎨 Status Indicators

- **✅ Completed**: File has corresponding test/doc file
- **⏳ Pending**: File missing test/doc file
- **🔍 Auto-detected**: Status determined by file scanning
- **👤 Manual Override**: Status manually set by user

## 🔍 Search & Filter

- **Search**: Filter files by name or path
- **Show Incomplete**: Display files missing tests or docs
- **Show Completed**: Display files with both tests and docs
- **Show Auto-detected**: Display files with automatically detected status
- **Sort Options**: Sort by name, path, or completion status

## 💾 Data Storage

- Uses browser localStorage for persistence
- Data survives browser restarts
- Export functionality for backup/sharing

## 🌐 Browser Compatibility

- Modern browsers with ES6+ support
- File API support required for file uploads
- Tested on Chrome, Firefox, Safari, Edge

## 📱 Mobile Support

- Responsive design works on mobile devices
- Touch-friendly interface
- Optimized for smaller screens

## 🚀 Getting Started

1. **Clone or download** this repository
2. **Open `index.html`** in your web browser
3. **Upload your Java project** using the folder selector
4. **Start tracking** your unit tests and documentation progress!

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - Feel free to use and modify for your team's needs.

## 🆘 Support

For issues or questions:
1. Check the browser console for errors
2. Ensure your browser supports the File API
3. Verify file naming conventions match expectations

---

**Perfect for teams that need to track testing progress without server setup!**
