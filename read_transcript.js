import fs from 'fs';
import path from 'path';

const logPath = 'C:\\Users\\Marcus\\.gemini\\antigravity\\brain\\e560f6e6-66bd-4709-a600-bcb8a63f1db4\\.system_generated\\logs\\transcript.jsonl';
if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf-8');
  const lines = content.split('\n');
  const userInputs = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'USER_INPUT') {
        userInputs.push(obj);
      }
    } catch (e) {
      // ignore parse errors
    }
  }
  
  console.log('--- LAST 10 USER INPUTS ---');
  userInputs.slice(-10).forEach((input, index) => {
    console.log(`\n[${index + 1}] Created At: ${input.created_at}`);
    console.log(input.content);
  });
} else {
  console.log('Log file does not exist at:', logPath);
}
