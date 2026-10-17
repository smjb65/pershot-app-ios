const fs = require('fs');
const path = require('path');

try {
  const cliDir = path.dirname(require.resolve('@react-native-community/cli-platform-android/package.json'));
  
  const findPkgPath = path.join(cliDir, 'build', 'config', 'findPackageName.js');
  if (fs.existsSync(findPkgPath)) {
    fs.writeFileSync(findPkgPath, `
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => "com.pershot.app";
exports.findPackageName = () => "com.pershot.app";
exports.getPackageName = () => "com.pershot.app";
    `.trim());
    console.log('? findPackageName.js patched');
  }

  const indexPath = path.join(cliDir, 'build', 'config', 'index.js');
  if (fs.existsSync(indexPath)) {
    let content = fs.readFileSync(indexPath, 'utf8');
    content = content.replace(/packageName:\s*[^,\n]+/, "packageName: 'com.pershot.app'");
    fs.writeFileSync(indexPath, content);
    console.log('? index.js patched');
  }

  const cliBin = path.join(__dirname, 'node_modules', '@react-native-community', 'cli', 'build', 'bin.js');
  const output = require('child_process').execSync(`node "${cliBin}" config`).toString();
  const json = JSON.parse(output);
  console.log('?? ??????? ??? ???? ?? ????? CLI:', json.project?.android?.packageName);
} catch (e) {
  console.error('? ???:', e.message);
}
