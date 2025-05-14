// Script to update all HTML files to reference main.css
const fs = require('fs');
const path = require('path');

const directory = __dirname;

// Get all HTML files
const htmlFiles = fs.readdirSync(directory).filter(file => file.endsWith('.html'));

htmlFiles.forEach(htmlFile => {
  const filePath = path.join(directory, htmlFile);
  console.log(`Processing ${htmlFile}...`);
  
  // Read the file content
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if the file already contains main.css
  if (content.includes('href="main.css"')) {
    console.log(`${htmlFile} already includes main.css, skipping.`);
    return;
  }

  // Extract the CSS filename from the HTML file
  const pageName = htmlFile.replace('.html', '');
  const cssFileName = `${pageName}.css`;
  
  // Check if the CSS file exists
  if (!fs.existsSync(path.join(directory, cssFileName))) {
    console.log(`Warning: ${cssFileName} not found, creating reference anyway.`);
  }
  
  // Replace the CSS link with main.css and the page-specific CSS
  const cssLinkRegex = new RegExp(`<link rel="stylesheet" href="${cssFileName}" />`);
  
  if (cssLinkRegex.test(content)) {
    content = content.replace(
      cssLinkRegex, 
      `<link rel="stylesheet" href="main.css" />\n  <link rel="stylesheet" href="${cssFileName}" />`
    );
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${htmlFile} to include main.css reference.`);
  } else {
    console.log(`Warning: Could not find CSS link in ${htmlFile}.`);
  }
});

console.log('All HTML files have been processed.');