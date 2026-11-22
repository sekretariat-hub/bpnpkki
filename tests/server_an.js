process.env.SESSION_SECRET='x'.repeat(40); process.env.AIRTABLE_TOKEN='t';
const root=require('path').resolve(__dirname,'..')+'/';
const U=require(root+'lib/users.js'); const {F,T}=U;
const T_={PER:'tbl21zOSogH7Anlu2',BPK:'tblgj0UYB9w7UWWnv',PD:'tblhmeuR1qFHxUIId',PEL:'tblTzNOMyrh4iF8MA',MOD:'tblymcTBL1pjIMa4A',PGR:'tblRzqA9mzvDBWgSZ',PEJ:'tblGR9a8J4UOyJGep'};
const per=(id,o)=>({id,fields:{fldVU2gofcKEhWHmB:'N '+id,...o}});
const db={
 [T_.PER]:[
  per('recAAAAAAAAAAAA01',{fldwJ7RnXW1nLaOcv:['recBPK00000000001'],fld3CxECAgWwecw77:['recPD000000000001'],fld3A1rRGfWxbuase:'Pria',fldpIbuKfSaL6uJY2:30,fldQaSUFxcYVFFKAX:['recMOD00000000001'],fldhP55DjyWd3Lpmb:['recMOD00000000001'],fldT8TCaA94MhNfri:['recPEL00000000001'],fld74efY9G9hb6nIG:['Jawa Barat'],fldGsFt4GflTXoTa0:'+6281234567890'}),
  per('recAAAAAAAAAAAA02',{fldwJ7RnXW1nLaOcv:['recBPK00000000002'],fld3CxECAgWwecw77:['recPD000000000002']}),
  per('recAAAAAAAAAAAA03',{fldwJ7RnXW1nLaOcv:['recBPK00000000001'],fld3CxECAgWwecw77:['recPD000000000002'],fldhjOTrQfLGC6hWj:'k@x.id'}),
  per('recKOORDPD0000001',{fldhjOTrQfLGC6hWj:'koordpd@x.id'}), per('recKOORDBPK000001',{fldhjOTrQfLGC6hWj:'koordbpk@x.id'}), per('recKOORDBPK000002',{fldhjOTrQfLGC6hWj:'harian@x.id'})],
 [T_.BPK]:[{id:'recBPK00000000001',fields:{fldxvUJvguk6J81mP:'Bandung'}},{id:'recBPK00000000002',fields:{fldxvUJvguk6J81mP:'Surabaya'}}],
 [T_.PD]:[{id:'recPD000000000001',fields:{fldzIeY3YMiHMo4ky:'PD Satu',fldWcO7mYhPFpFXlA:['recBPK00000000001'],fldxlRQG4ikb8coP2:[]}},{id:'recPD000000000002',fields:{fldzIeY3YMiHMo4ky:'PD Dua',fldWcO7mYhPFpFXlA:['recBPK00000000002'],fldxlRQG4ikb8coP2:['recKOORDPD0000001']}}],
 [T_.PEL]:[{id:'recPEL00000000001',fields:{fldBHtlKeydYGUfPo:'Pewarta'}}],[T_.MOD]:[{id:'recMOD00000000001',fields:{fldocxJbZYt5nn9NS:'SHDR',fld04TLxwRqpdkS1V:'Tahap 1'}}],
 [T_.PGR]:[{id:'recPGR000000000001',fields:{fldJgxaz4f5MmEbnS:['recKOORDBPK000002']}}],[T_.PEJ]:[{id:'recPEJ000000000001',fields:{fldrGASVYBRTS7v8o:['recBPK00000000001'],fldCYWlWFYtnkjv6Z:['recKOORDBPK000001','recKOORDBPK000002'],fldyWZFFnXeN8CMlk:'AKTIF'}}],
 [T]:[]};
const user=(id,peran,person,email)=>({id,fields:{[F.aktif]:true,[F.disetujui]:true,[F.email]:email,[F.nama]:'U '+id,[F.person]:person,'fldsTal4cl44WawC3':peran,[F.wa]:'6281'}});
db[T]=[user('recUSER0000000001','Koordinator PD','recKOORDPD0000001','koordpd@x.id'),user('recUSER0000000002','Koordinator BPK','recKOORDBPK000001','koordbpk@x.id'),user('recUSER0000000003','Koordinator BPK','recKOORDBPK000002','harian@x.id'),user('recUSER0000000004','Admin','','a@x.id'),user('recUSER0000000005','PIC BPK','recKOORDBPK000001','pic@x.id'),user('recUSER0000000006','Koordinator PD','recAAAAAAAAAAAA02','xx@x.id')];
const match=(rows,f)=>{let m; if(!f) return rows; if((m=f.match(/RECORD_ID\(\)='(\w+)'/))) return rows.filter(r=>r.id===m[1]); if((m=f.match(/LOWER\(\{Email\}\)='([^']*)'/))) return rows.filter(r=>String(r.fields[F.email]||r.fields.fldhjOTrQfLGC6hWj||'').toLowerCase()===m[1]); return rows;};
const fake={fetchAll:async(t,fl,ex={})=>match(db[t]||[],ex.filterByFormula).slice(0,ex.maxRecords?+ex.maxRecords:1e9),listByIds:async(t,ids)=>(db[t]||[]).filter(r=>ids.includes(r.id)),update:async()=>{},create:async()=>({id:'x'}),BASE:'x'};
require.cache[require.resolve(root+'lib/airtable.js')]={id:'a',filename:'a',loaded:true,exports:fake};
const A=require(root+'lib/access.js'); const an=require(root+'lib/analitik.js');
const ok=(c,m)=>console.log(c?'OK  ':'FAIL',m);
(async()=>{
 const get=(id)=>A.getAccess({rid:id});
 const kpd=await get('recUSER0000000001'); ok(kpd.pdIds&&kpd.pdIds.join()==='recPD000000000002'&&!kpd.nasional,'Koordinator PD -> hanya PD yang ia koordinatori');
 ok(kpd.perm.modul===1&&kpd.perm.umat===1&&kpd.perm.proker===0&&kpd.perm.dashboard===0&&kpd.perm.pengurus===0,'Koordinator PD: hanya menu Modul & Data Umat');
 const kb=await get('recUSER0000000002'); ok(kb.bpkIds.join()==='recBPK00000000001'&&kb.nasional===false,'Koord BPK biasa (bukan pengurus harian) -> hanya keuskupannya');
 const kb2=await get('recUSER0000000003'); ok(kb2.nasional===true,'Pengurus Harian (di tabel pengurus) -> nasional');
 const pic=await get('recUSER0000000005'); ok(pic.nasional===false&&pic.bpkIds.length===1,'PIC BPK biasa -> hanya keuskupannya');
 const ad=await get('recUSER0000000004'); ok(ad.nasional&&ad.perm.modul===2,'Admin nasional');
 const kn=await get('recUSER0000000006'); ok(Array.isArray(kn.pdIds)&&kn.pdIds.length===0,'Koordinator PD bukan koordinator PD mana pun -> kosong');
 let r=await an.analitik(ad); ok(r.orang.length===6&&r.scope.tipe==='nasional','nasional: semua umat ('+r.orang.length+')');
 const o1=r.orang.find(x=>x.id==='recAAAAAAAAAAAA01');  ok(o1.jk==='P'&&o1.u===30&&o1.mi.length===1&&o1.ma.length===1&&o1.pl[0]==='recPEL00000000001'&&o1.wa===1&&o1.prov==='Jawa Barat'&&o1.l===0,'bentuk data umat benar');
 r=await an.analitik(kpd); ok(r.scope.tipe==='pd'&&r.orang.map(o=>o.id).sort().join()==='recAAAAAAAAAAAA02,recAAAAAAAAAAAA03'&&/PD Dua/.test(r.scope.label),'Koord PD hanya melihat umat PD-nya: '+r.orang.length);
 const kbOnly={...kb}; r=await an.analitik(kbOnly); ok(r.scope.tipe==='bpk'&&r.orang.every(o=>o.kus==='recBPK00000000001')&&r.orang.length===2,'Koord BPK (bukan pengurus) hanya melihat keuskupannya: '+r.orang.length);
 r=await an.analitik({...kbOnly,bpkIds:null,pdIds:null}); ok(r.orang.length===0,'tanpa cakupan -> kosong');
})();
