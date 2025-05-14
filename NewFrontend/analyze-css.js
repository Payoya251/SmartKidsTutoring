// Script to analyze CSS files and identify common styles
const fs = require('fs');
const path = require('path');

const directory = __dirname;

// Get all CSS files except main.css
const cssFiles = fs.readdirSync(directory)
  .filter(file => file.endsWith('.css') && file !== 'main.css');

console.log(`Found ${cssFiles.length} CSS files to analyze.`);

// List of common selectors that are likely already in main.css
const commonSelectors = [
  'html', 'body', '.header-bar', '.top-right-nav', '.hamburger', 
  '.sidebar', '.hero', '.hero-logo', '.hero-heading', '.hero-subtext',
  'footer', '@keyframes'
];

// Check each CSS file
cssFiles.forEach(cssFile => {
  console.log(`\nAnalyzing ${cssFile}...`);
  
  const filePath = path.join(directory, cssFile);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check for common selectors
  let containsCommonSelectors = false;
  commonSelectors.forEach(selector => {
    if (content.includes(selector)) {
      console.log(`- Contains common selector: ${selector}`);
      containsCommonSelectors = true;
    }
  });
  
  if (!containsCommonSelectors) {
    console.log('- No common selectors found, this file likely only contains page-specific styles.');
  } else {
    console.log('- This file contains common styles that should be moved to main.css.');
  }
  
  // Calculate file size to see optimization opportunity
  const stats = fs.statSync(filePath);
  const fileSizeKB = stats.size / 1024;
  console.log(`- File size: ${fileSizeKB.toFixed(2)} KB`);
});

console.log('\nAnalysis complete. Common styles should be removed from individual CSS files and kept only in main.css.');