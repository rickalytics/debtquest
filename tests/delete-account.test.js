import { beforeEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
let handler, user, passwordOK, deleted;
beforeEach(()=>{
 user={id:'caller',email:'caller@example.invalid'};passwordOK=true;deleted=[];
 const createClient=()=>({auth:{
  getUser:async token=>({data:{user:token==='valid'?user:null},error:token==='valid'?null:new Error('bad token')}),
  signInWithPassword:async()=>({data:{user:passwordOK?user:null},error:passwordOK?null:new Error('bad password')}),
  signOut:async()=>({error:null}),admin:{deleteUser:async id=>{deleted.push(id);return {error:null};}},
 }});
 const source=readFileSync('supabase/functions/delete-account/index.ts','utf8').replace(/^import .*;\n/,'');
 const js=transformSync(source,{loader:'ts',target:'es2022'}).code;
 new Function('createClient','Deno',js)(createClient,{env:{get:()=> 'test'},serve:fn=>{handler=fn;}});
});
function request(token='valid',body={password:'test'}){return new Request('https://example.invalid/delete-account',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});}
it('rejects invalid authentication before deletion',async()=>{expect((await handler(request('invalid'))).status).toBe(401);expect(deleted).toEqual([]);});
it('rejects a wrong password without deleting any account',async()=>{passwordOK=false;expect((await handler(request())).status).toBe(401);expect(deleted).toEqual([]);});
it('deletes only the token owner even when a different user ID is supplied',async()=>{
 const response=await handler(request('valid',{password:'test',user_id:'victim'}));expect(response.status).toBe(200);expect(await response.json()).toEqual({deleted:true});expect(deleted).toEqual(['caller']);
});
it('allows preflight without performing a mutation',async()=>{await handler(new Request('https://example.invalid',{method:'OPTIONS'}));expect(deleted).toEqual([]);});
