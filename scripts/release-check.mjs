import { loadEnv } from 'vite';
import { readFileSync, existsSync } from 'node:fs';
const env=loadEnv('ios',process.cwd(),'');
const errors=[];
const requireCheck=(condition,message)=>{if(!condition)errors.push(message);};
const config=JSON.parse(readFileSync('capacitor.config.json','utf8'));
requireCheck(!config.server?.url,'Remove any remote/live-reload server URL.');
requireCheck(['local','cloud'].includes(env.VITE_DATA_MODE),'Set VITE_DATA_MODE in .env.ios.local.');
requireCheck(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.VITE_SUPPORT_EMAIL||''),'Set a monitored VITE_SUPPORT_EMAIL and rebuild both iOS and the support website.');
if(env.VITE_DATA_MODE==='cloud'){
 requireCheck(/^https:\/\//.test(env.VITE_SUPABASE_URL||'')&&!!env.VITE_SUPABASE_ANON_KEY,'Set the existing Supabase project HTTPS URL and public anon/publishable key.');
 const key=env.VITE_SUPABASE_ANON_KEY||'';
 let role;try{role=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()).role;}catch{}
 requireCheck(role!=='service_role'&&!key.startsWith('sb_secret_'),'A server secret cannot be bundled into the app. Replace it with the public key.');
}
for(const path of ['ios/App/App/PrivacyInfo.xcprivacy','ios/App/App/public/index.html','ios/App/App/public/privacy.html','ios/App/App/public/support.html','ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png']) requireCheck(existsSync(path),`Missing ${path}; run npm run ios:sync.`);
requireCheck(!existsSync('ios/App/App/public/sw.js'),'Native bundle contains a service worker. Build with npm run ios:sync.');
if(errors.length){console.error(errors.map(e=>`BLOCKED: ${e}`).join('\n'));process.exitCode=1;}
else console.log('Automated preparation checks passed. Complete docs/app-store/RELEASE.md, device testing, hosted URLs, and Apple signing before submission.');
