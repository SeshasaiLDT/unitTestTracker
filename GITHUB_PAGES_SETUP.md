# 🚀 Deploy to GitHub Pages - Step by Step Guide

Follow these steps to deploy your Java Unit Test Tracker to GitHub Pages:

## Step 1: Create GitHub Repository

1. **Go to GitHub.com** and sign in to your account
2. **Click the "+" icon** in the top right corner → "New repository"
3. **Repository name**: `java-unit-test-tracker` (or your preferred name)
4. **Description**: "Client-side Java unit test and documentation tracker"
5. **Set to Public** (required for free GitHub Pages)
6. **Check "Add a README file"**
7. **Click "Create repository"**

## Step 2: Upload Your Files

### Option A: Using GitHub Web Interface
1. **Click "uploading an existing file"** on your new repository page
2. **Drag and drop** or select these files from your computer:
   ```
   docs/
   ├── index.html
   ├── README.md
   └── public/
       ├── styles.css
       ├── script.js
       └── index.html
   ```
3. **Write commit message**: "Initial commit - Java Unit Test Tracker"
4. **Click "Commit changes"**

### Option B: Using Git Command Line
```bash
# Clone your new repository
git clone https://github.com/YOURUSERNAME/java-unit-test-tracker.git
cd java-unit-test-tracker

# Copy files from your local directory
# (Copy the docs folder contents to your repository)

# Add, commit, and push
git add .
git commit -m "Initial commit - Java Unit Test Tracker"
git push origin main
```

## Step 3: Enable GitHub Pages

1. **Go to your repository** on GitHub
2. **Click "Settings"** tab
3. **Scroll down to "Pages"** in the left sidebar
4. **Under "Source"**, select "Deploy from a branch"
5. **Select "main" branch** and "/docs" folder
6. **Click "Save"**

## Step 4: Access Your Tracker

1. **Wait 2-3 minutes** for deployment
2. **Your tracker will be available at**:
   ```
   https://YOURUSERNAME.github.io/java-unit-test-tracker/
   ```
3. **GitHub will show you the URL** in the Pages settings

## Step 5: Share with Your Team

1. **Share the URL** with your team members
2. **Each person can**:
   - Upload their Java project files
   - Track their progress
   - Export data to share with others
   - Import team progress data

## 🎯 Pro Tips

### Custom Domain (Optional)
- You can use a custom domain like `tracker.yourcompany.com`
- Add a `CNAME` file in the docs folder with your domain

### Team Workflow
1. **One person sets up** the GitHub Pages site
2. **Team members use the live URL** to track progress
3. **Export/import data** to share progress updates
4. **No server maintenance** required!

### Updates and Maintenance
- **To update**: Just push new commits to the `main` branch
- **Changes appear** within minutes on your live site
- **No downtime** during updates

## 🔧 Troubleshooting

### "Page Not Found" Error
- Check that you selected the correct branch and folder
- Ensure the `docs` folder contains `index.html`
- Wait a few minutes for changes to propagate

### Files Not Loading
- Verify all files are in the correct `docs/public/` structure
- Check that file paths in HTML are correct
- Clear browser cache and try again

### Auto-Detection Not Working
- Ensure your browser supports the File API
- Try a different browser (Chrome, Firefox, Safari)
- Check browser console for errors

## 📞 Support

If you encounter issues:
1. Check the GitHub Pages documentation
2. Verify your file structure matches the example
3. Test locally by opening `docs/index.html` in your browser

---

**🎉 Your team will love having this tracker available 24/7 without any server setup!**
