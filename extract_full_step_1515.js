import fs from 'fs';

const logPath = 'C:\\Users\\Marcus\\.gemini\\antigravity\\brain\\e560f6e6-66bd-4709-a600-bcb8a63f1db4\\.system_generated\\logs\\transcript.jsonl';
if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf-8');
  const lines = content.split('\n');
  
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const idx = line.indexOf('"step_index":1515');
      if (idx !== -1) {
        // Let's find "ReplacementContent" of the second chunk
        const rcTerm = '"ReplacementContent":"// POST /api/garimpar';
        const startIdx = line.indexOf(rcTerm);
        if (startIdx !== -1) {
          // Find the end of this string (unescaped quote)
          let endIdx = startIdx + rcTerm.length;
          while (endIdx < line.length) {
            if (line[endIdx] === '"' && line[endIdx - 1] !== '\\') {
              break;
            }
            endIdx++;
          }
          const escapedContent = line.substring(startIdx + '"ReplacementContent":'.length + 1, endIdx);
          // Unescape backslashes, newlines, etc.
          const unescaped = escapedContent
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
          fs.writeFileSync('original_garimpar.txt', unescaped);
          console.log("Extracted to original_garimpar.txt!");
        } else {
          console.log("Could not find ReplacementContent start in line");
        }
      }
    } catch (e) {
      console.error(e);
    }
  }
} else {
  console.log('Log file does not exist');
}
