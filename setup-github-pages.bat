@echo off
echo.
echo ========================================
echo   Java Unit Test Tracker - GitHub Pages Setup
echo ========================================
echo.

echo [1/4] Creating docs directory structure...
if not exist "docs" mkdir docs
if not exist "docs\public" mkdir docs\public

echo [2/4] Copying files to docs directory...
copy "public\*" "docs\public\" >nul 2>&1
copy "index.html" "docs\" >nul 2>&1
copy "README.md" "docs\" >nul 2>&1

echo [3/4] Creating GitHub Pages configuration...
echo. > docs\.nojekyll

echo [4/4] Files ready for GitHub Pages deployment!
echo.
echo ========================================
echo   NEXT STEPS:
echo ========================================
echo.
echo 1. Create a new GitHub repository
echo 2. Upload the 'docs' folder to your repository
echo 3. Enable GitHub Pages in repository settings
echo 4. Select 'main' branch and '/docs' folder
echo 5. Your tracker will be live at:
echo    https://YOURUSERNAME.github.io/REPOSITORY-NAME/
echo.
echo For detailed instructions, see: GITHUB_PAGES_SETUP.md
echo.
pause
