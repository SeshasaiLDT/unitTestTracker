<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Java Unit Test Tracker - Copilot Instructions

This is a Node.js web application for tracking unit test and documentation completion across large Java codebases.

## Project Structure
- `server.js` - Express.js server with REST API
- `scripts/scan-java-files.js` - File scanning logic for Java projects
- `public/` - Frontend web interface (HTML, CSS, JavaScript)
- `data/` - JSON data storage for file tracking

## Key Features
1. **Automatic Detection**: Scans Java files and automatically detects corresponding test files (`*_tests.java`) and documentation files (`*.pdf`)
2. **Team Collaboration**: File-based storage that works with version control
3. **Manual Override**: Users can manually override automatic detection
4. **Progress Tracking**: Real-time statistics and filtering

## Code Conventions
- Use async/await for asynchronous operations
- Prefer ES6+ features (arrow functions, destructuring, etc.)
- Use meaningful variable names and comments
- Handle errors gracefully with try-catch blocks
- Follow REST API conventions for endpoints

## File Naming Patterns
- Java files: `*.java`
- Test files: `*_tests.java`
- Documentation: `*.pdf`

## When making changes:
1. Preserve the automatic detection logic
2. Maintain backward compatibility with existing data
3. Handle edge cases for file paths and special characters
4. Keep the web interface responsive and user-friendly
5. Ensure cross-platform compatibility (Windows, Mac, Linux)

## API Design
- GET `/api/files` - Return all files with status
- PUT `/api/files/:id` - Update file status
- GET `/api/stats` - Return progress statistics

## Testing Approach
- Test file scanning with various directory structures
- Verify automatic detection of test and documentation files
- Test manual override functionality
- Ensure data persistence across server restarts
