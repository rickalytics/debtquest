import { loadEnv } from 'vite';
import { writeFileSync } from 'node:fs';
const env=loadEnv('ios',process.cwd(),'');
if(!['local','cloud'].includes(env.VITE_DATA_MODE)) throw new Error('Choose local or cloud mode before generating the privacy manifest.');
const collected=env.VITE_DATA_MODE==='cloud' ? ['EmailAddress','Name','UserID','OtherFinancialInfo','OtherUserContent'] : [];
const dictionaries=collected.map(type=>`<dict>
  <key>NSPrivacyCollectedDataType</key><string>NSPrivacyCollectedDataType${type}</string>
  <key>NSPrivacyCollectedDataTypeLinked</key><true/>
  <key>NSPrivacyCollectedDataTypeTracking</key><false/>
  <key>NSPrivacyCollectedDataTypePurposes</key><array><string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string></array>
</dict>`).join('\n');
writeFileSync('ios/App/App/PrivacyInfo.xcprivacy',`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>NSPrivacyTracking</key><false/>
<key>NSPrivacyTrackingDomains</key><array/>
<key>NSPrivacyAccessedAPITypes</key><array><dict>
<key>NSPrivacyAccessedAPIType</key><string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
<key>NSPrivacyAccessedAPITypeReasons</key><array><string>C617.1</string></array>
</dict></array>
<key>NSPrivacyCollectedDataTypes</key><array>${dictionaries}</array>
</dict></plist>
`);
console.log(`Privacy manifest generated for ${env.VITE_DATA_MODE} mode. Confirm provider practices before submission.`);
