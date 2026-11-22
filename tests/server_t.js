process.env.SESSION_SECRET='x'.repeat(40); process.env.AIRTABLE_TOKEN='t'; process.env.BABLAST_API_KEY='k';
const path=require('path'); const root=require('path').resolve(__dirname,'..')+'/';
const db={ OTP:[], USERS:[], PERSON:[{id:'recPERSON00000001',fields:{fldVU2gofcKEhWHmB:'Budi',fldGsFt4GflTXoTa0:'+628122965381',fldhjOTrQfLGC6hWj:'b@x.id'}}], BPK:[{id:'recBPK0000000001a',fields:{fldxvUJvguk6J81mP:'Surabaya'}}] };
let n=1; const sent=[];
const tbl=(t)=>t==='tblfcnCVbzFJPHq8y'?db.OTP:t==='tbl25Nl4B7Hht9Xs8'?db.USERS:t==='tbl21zOSogH7Anlu2'?db.PERSON:db.BPK;
const match=(rows,f)=>{ if(!f) return rows; let m; if((m=f.match(/^\{Whatsapp\}='(\d+)'$/))) return rows.filter(r=>(r.fields.fldrIwvZ1Hq5zgiFc||r.fields.fldrIWQ1Z06n0R4GH)===m[1]); if(f.startsWith('FIND(')){const nat=f.match(/FIND\('(\d+)'/)[1]; return rows.filter(r=>String(r.fields.fldGsFt4GflTXoTa0||'').replace(/\D/g,'').includes(nat));} if((m=f.match(/RECORD_ID\(\)='(\w+)'/))) return rows.filter(r=>r.id===m[1]); return rows; };
const fake={ fetchAll:async(t,fl,ex={})=>match(tbl(t),ex.filterByFormula), update:async(t,id,f)=>{const r=tbl(t).find(x=>x.id===id);Object.assign(r.fields,f);return r;}, create:async(t,f)=>{const r={id:'rec'+String(n++).padStart(14,'0'),fields:{...f}};tbl(t).push(r);return r;}, listByIds:async()=>[], BASE:'x' };
require.cache[require.resolve(root+'lib/airtable.js')]={id:'a',filename:'a',loaded:true,exports:fake};
const wa=require(root+'lib/wa.js'); require.cache[require.resolve(root+'lib/wa.js')].exports={kirimWa:async(no,msg)=>{sent.push([no,msg]);}};
const akses=require(root+'api/akses.js'); const login=require(root+'api/login.js');
const call=async(h,body,m='POST')=>{let out={};const res={headers:{},setHeader(k,v){this.headers[k]=v},status(c){out.s=c;return this},json(j){out.j=j;return this},send(){return this}};await h({method:m,body,headers:{}},res);out.cookie=res.headers['Set-Cookie'];return out;};
(async()=>{
  console.log('cek baru', (await call(akses,{action:'cek',phone:'0899 1111 2222'})).j);
  let r=await call(akses,{action:'kirim',phone:'089911112222'}); console.log('kirim', r.j, sent.length);
  const code=sent[0][1].match(/\*(\d{4})\*/)[1];
  r=await call(akses,{action:'kirim',phone:'089911112222'}); console.log('kirim2 (tunggu)', r.s);
  r=await call(akses,{action:'verifikasi',phone:'089911112222',code:'0000'==code?'1111':'0000'}); console.log('salah', r.s, r.j.error);
  r=await call(akses,{action:'verifikasi',phone:'089911112222',code}); console.log('benar', r.j.tujuan, r.j.perluProfil); const grant=r.j.grant;
  r=await call(akses,{action:'simpan',grant,password:'abc12345',ulang:'abc12345',profil:{nama:'Ani',panggilan:'Ani',jk:'Wanita',email:'a@b.co',keuskupan:'recBPK0000000001a',tgl:3,bln:4,thn:1990}}); console.log('daftar', r.s, r.j);
  r=await call(login,{phone:'089911112222',password:'abc12345'}); console.log('login', r.j);
  r=await call(login,{phone:'089911112222',password:'salah123'}); console.log('login salah', r.s);
  // nomor ada di M-Person -> link
  sent.length=0; await call(akses,{action:'kirim',phone:'+62 812-2965-381'}); const c2=sent[0][1].match(/\*(\d{4})\*/)[1];
  r=await call(akses,{action:'verifikasi',phone:'628122965381',code:c2}); console.log('person ada (profil belum lengkap)', r.j.perluProfil, r.j.orang);
  let rr=await call(akses,{action:'simpan',grant:r.j.grant,password:'abc12345',ulang:'abc12345'}); console.log('tanpa profil ditolak', rr.s, rr.j.error); r=await call(akses,{action:'simpan',grant:r.j.grant,password:'abc12345',ulang:'abc12345',profil:{nama:'Budi',panggilan:'Budi',jk:'Pria',email:'b@x.id',keuskupan:'recBPK0000000001a',tgl:1,bln:1,thn:1980}}); console.log('link person', r.j, db.USERS[1].fields.fld3EFXzjVXjs3GIU, 'person tetap', db.PERSON.length, db.PERSON[0].fields.fldmTqYBcGuYVkkgM);
  // reset
  db.OTP.forEach(o=>o.fields.fld0BkdKiZtOnIxCN=0); sent.length=0;
  r=await call(akses,{action:'kirim',phone:'089911112222'}); console.log('reset tujuan', r.j.tujuan);
})();
