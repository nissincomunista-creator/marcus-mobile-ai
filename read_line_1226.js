import fs from 'fs';

const logPath = 'C:\\Users\\Marcus\\.gemini\\antigravity\\brain\\e560f6e6-66bd-4709-a600-bcb8a63f1db4\\.system_generated\\logs\\transcript.jsonl';
if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf-8');
  const lines = content.split('\n');
  
  // Let's find the step_index 1515 or around it
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.step_index >= 1500 && obj.step_index <= 1530) {
        if (obj.tool_calls) {
          for (const tc of obj.tool_calls) {
            if (tc.name === 'replace_file_content' || tc.name === 'multi_replace_file_content') {
              console.log(`STEP ${obj.step_index}:`);
              console.log(JSON.stringify(tc, null, 2));
            }
          }
        }
      }
    } catch (e) {}
  }
} else {
  console.log('Log file does not exist');
}
