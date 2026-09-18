const fs = require('fs');
const cp = require('child_process');

try {
  const lnkPath = 'C:\\Users\\Marcus\\OneDrive\\Desktop\\Marcus - Assessoria Imobiliaria.lnk';
  if (fs.existsSync(lnkPath)) {
    const raw = fs.readFileSync(lnkPath, 'latin1');
    const strings = raw.match(/([a-zA-Z]:\\[^\x00-\x1f"<>|*?]+)/g) || [];
    console.log('LNK strings found:', strings);
  } else {
    console.log('LNK does not exist at OneDrive Desktop');
  }
} catch (e) {
  console.error(e);
}
