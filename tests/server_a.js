process.env.SESSION_SECRET='x'.repeat(40); process.env.AIRTABLE_TOKEN='t';
const root=require('path').resolve(__dirname,'..')+'/';
const users=[{id:'recUSER0000000001',fields:{fldrIWQ1Z06n0R4GH:'628122965381',fldrc7wiuxwASQHc6:'Budi Sutedjo',fldgHpmz2FtoMnPal:true,flddxhVbe1s20Lg1r:true,fldsTal4cl44WawC3:{name:'Editor BPN'},fldFTzT6UpjetrEsM:'b@x.id'}}];
const persons=[{id:'recPERSON00000001',fields:{fldVU2gofcKEhWHmB:'Ani Wati',fldGsFt4GflTXoTa0:'+628111222333',fldhjOTrQfLGC6hWj:'a@x.id'}}];
const fake={fetchAll:async(t,fl,ex={})=>{const f=ex.filterByFormula||'';const rows=t==='tbl21zOSogH7Anlu2'?persons:users;let m;if((m=f.match(/RECORD_ID\(\)='(\w+)'/)))return rows.filter(r=>r.id===m[1]);if((m=f.match(/\{Whatsapp\}='(\d+)'/)))return rows.filter(r=>r.fields.fldrIWQ1Z06n0R4GH===m[1]);return rows;},update:async(t,id,f)=>{Object.assign(users.find(u=>u.id===id).fields,f);},create:async(t,f)=>{users.push({id:'recNEW0000000000'+users.length,fields:f});return users[users.length-1];},listByIds:async()=>[]};
require.cache[require.resolve(root+'lib/airtable.js')]={id:'a',filename:'a',loaded:true,exports:fake};
const A=require(root+'lib/access.js'); A.getAccess=async()=>({id:'recADMIN',email:'admin',perm:{admin:2}}); 
const au=require(root+'lib/auth.js'); au.getSession=()=>({rid:'recADMIN',email:'admin'});
A.can=()=>true;
const sent=[];require.cache[require.resolve(root+'lib/wa.js')]={id:'w',filename:'w',loaded:true,exports:{kirimWa:async(n,m)=>{if(process.env.FAIL){const e=new Error('x');e.code='NOKEY';throw e;}sent.push([n,m]);}}};
const h=require(root+'api/admin.js');
const call=async(b)=>{let o={};await h({method:'POST',headers:{host:'bpnpkki.vercel.app'},body:b},{setHeader(){},status(c){o.s=c;return this},json(j){o.j=j;return this}});return o;};
(async()=>{
 let r=await call({action:'create',personId:'recPERSON00000001',peran:'Pengamat'});console.log('create',r.j.ok,r.j.terkirim,sent[0]&&sent[0][0],/\?invite=/.test(sent[0][1]));
 r=await call({action:'kirimwa',id:'recUSER0000000001'});console.log('kirimwa',r.j.ok,r.j.terkirim,sent.length);
 process.env.FAIL=1;r=await call({action:'kirimwa',id:'recUSER0000000001'});console.log('gagal',r.j.terkirim,r.j.galat);
})();
