const fs = require('fs');
const { createCanvas } = require('canvas');
const path = require('path');

// Create default profile picture
function createDefaultProfilePicture() {
  const canvas = createCanvas(200, 200);
  const ctx = canvas.getContext('2d');

  // Fill background
  ctx.fillStyle = '#3f51b5';
  ctx.fillRect(0, 0, 200, 200);

  // Draw user icon
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  // Head
  ctx.arc(100, 80, 40, 0, Math.PI * 2, true);
  ctx.fill();
  // Body
  ctx.beginPath();
  ctx.arc(100, 230, 80, 0, Math.PI, false);
  ctx.fill();

  // Save to file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(__dirname, '../public/default-profile.png'), buffer);
  console.log('Default profile picture created');
}

// Create default company logo
function createDefaultCompanyLogo() {
  const canvas = createCanvas(300, 150);
  const ctx = canvas.getContext('2d');

  // Fill background
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, 300, 150);

  // Draw logo text
  ctx.font = 'bold 30px Arial';
  ctx.fillStyle = '#3f51b5';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('COMPANY', 150, 75);

  // Save to file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(__dirname, '../public/default-logo.png'), buffer);
  console.log('Default company logo created');
}

// Create both default images
createDefaultProfilePicture();
createDefaultCompanyLogo();

console.log('Default images generated successfully');
