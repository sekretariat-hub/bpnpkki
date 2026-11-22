process.env.SESSION_SECRET='x'.repeat(40); process.env.AIRTABLE_TOKEN='t';
const root=require('path').resolve(__dirname,'..')+'/';
const T={PER:'tbl21zOSogH7Anlu2',BPK:'tblgj0UYB9w7UWWnv',PD:'tblhmeuR1qFHxUIId',PAR:'tblqKpvfwGtLEHnip',KOTA:'tblSaXvGJJ7G1P9my',PEL:'tblTzNOMyrh4iF8MA',MOD:'tblymcTBL1pjIMa4A',ANT:'tblRarr3Rk6PQ1C8j'};
const db={[T.PER]:[{id:'recME0000000000a1',fields:{fldVU2gofcKEhWHmB:'Budi Santoso',fldGsFt4GflTXoTa0:'+6281234567890',fldhjOTrQfLGC6hWj:'b@x.id'}},{id:'recOTH000000000a1',fields:{fldVU2gofcKEhWHmB:'Orang Lain'}}],
 [T.BPK]:[{id:'recBPK0000000001a',fields:{fldxvUJvguk6J81mP:'Surabaya'}}],
 [T.PD]:[{id:'recPD00000000001a',fields:{fldzIeY3YMiHMo4ky:'PD Yosef',fldWcO7mYhPFpFXlA:['recBPK0000000001a']}}],
 [T.PAR]:[{id:'recPAR0000000010a',fields:{fldU7KKCH19jGvG6T:'St. Yosef',fldD3brFiEGKFVgzT:['recBPK0000000001a']}}],
 [T.KOTA]:[{id:'recKOT0000000010a',fields:{fldzDMmFzXQUgTC8g:'Kota Surabaya',fldmjgXiXurcORn1B:'Jawa Timur'}}],
 [T.PEL]:[{id:'recPL10000000010a',fields:{fldBHtlKeydYGUfPo:'Moderator'}},{id:'recPL20000000010a',fields:{fldBHtlKeydYGUfPo:'Moderator'}},{id:'recPL30000000010a',fields:{fldBHtlKeydYGUfPo:'Pewarta'}},{id:'recPL40000000010a',fields:{fldBHtlKeydYGUfPo:'Doa'}}],
 [T.MOD]:[{id:'recMOD0000000010a',fields:{fldocxJbZYt5nn9NS:'SHDR'}},{id:'recMOD0000000020a',fields:{fldocxJbZYt5nn9NS:'Pertumbuhan'}}],[T.ANT]:[]};
let n=1;
const match=(rows,f)=>{let m; if(!f) return rows; if((m=f.match(/RECORD_ID\(\)='(\w+)'/))) return rows.filter(r=>r.id===m[1]); if(f.startsWith('FIND(')){const nat=f.match(/FIND\('(\d+)'/)[1];return rows.filter(r=>String(r.fields.fldGsFt4GflTXoTa0||'').replace(/\D/g,'').includes(nat));} if((m=f.match(/SEARCH\('([^']*)'/))) return rows.filter(r=>String(r.fields.fldzDMmFzXQUgTC8g||'').toLowerCase().includes(m[1])); return rows;};
const fake={fetchAll:async(t,fl,ex={})=>match(db[t]||[],ex.filterByFormula),listByIds:async(t,ids)=>(db[t]||[]).filter(r=>ids.includes(r.id)),update:async(t,id,f)=>{Object.assign(db[t].find(r=>r.id===id).fields,f);},create:async(t,f)=>{const r={id:'rec'+String(n++).padStart(14,'0'),fields:{...f}};db[t].push(r);return r;},BASE:'appX'};
require.cache[require.resolve(root+'lib/airtable.js')]={id:'a',filename:'a',loaded:true,exports:fake};
const mails=[];require.cache[require.resolve(root+'lib/mail.js')]={id:'m',filename:'m',loaded:true,exports:{kirimAdmin:async(s,t)=>{mails.push(s);return true;}}};
global.fetch=async(u,o)=>{ if(String(u).includes('uploadAttachment')){ const r=db[T.PER][0]; r.fields.fldIuYdJWnN77zoaT=[...(r.fields.fldIuYdJWnN77zoaT||[]),{id:'att'+(n++),url:'http://x/f.jpg',thumbnails:{large:{url:'http://x/l.jpg'}}}]; return {ok:true,json:async()=>({id:r.id,fields:{fldIuYdJWnN77zoaT:r.fields.fldIuYdJWnN77zoaT}})}; } throw new Error('fetch '+u); };
const A=require(root+'lib/access.js');const au=require(root+'lib/auth.js');au.getSession=()=>({rid:'x'});
let ACC={nama:'Budi',peran:'Koordinator BPK',email:'b@x.id',wa:'6281234567890',personId:'',perm:{}};
A.getAccess=async()=>ACC;
const h=require(root+'api/profil.js');
const call=async(method,q,b)=>{let o={};await h({method,query:q||{},headers:{},body:b},{setHeader(){},status(c){o.s=c;return this},json(j){o.j=j;return this}});return o;};
const ok=(c,m)=>console.log(c?'OK  ':'FAIL',m);
(async()=>{
 let r=await call('GET');ok(r.j&&r.j.profil&&r.j.profil.id==='recME0000000000a1','baca profil sendiri via WA');
 ok(r.j.kurang.includes('Foto')&&r.j.kurang.includes('Asal Persekutuan Doa (PD)'),'kurang berisi Foto & PD: '+r.j.kurang.length+' item');
 ok(r.j.opsi.pelayanan.filter(g=>g.nama==='Moderator').length===1,'pelayanan nama sama digabung');
 r=await call('POST',{},{act:'simpan',data:{email:'salah'}});ok(r.s===400,'email salah ditolak');
 r=await call('POST',{},{act:'simpan',data:{tgl:31,bln:2,thn:1990}});ok(r.s===400,'tgl 31 Feb ditolak');
 r=await call('POST',{},{act:'simpan',data:{pan:'Budi',jk:'Pria',tgl:5,bln:3,thn:1980,kus:'recBPK0000000001a',kota:'recKOT0000000010a',paroki:'recPAR0000000010a',alamat:'Jl. A',kategori:'Awam',baptis:'Sudah',krisma:'Sudah',size:'L',pd:'recPD00000000001a'}});
 ok(r.j&&r.j.ok&&r.j.kurang.length===1&&r.j.kurang[0]==='Foto','simpan lengkap kecuali foto: '+JSON.stringify(r.j&&r.j.kurang));
 r=await call('POST',{},{act:'simpan',data:{kategori:'Dewa'}});ok(r.s===400,'kategori tak valid ditolak');
 r=await call('POST',{},{act:'simpan',data:{pelayanan:['recPL30000000010a']}});ok(r.j.kurang.includes('Modul yang Anda ajar')&&!r.j.kurang.includes('Bab yang Anda ajar'),'pilih Pewarta -> modul wajib, bab tidak ditanya');
 r=await call('POST',{},{act:'simpan',data:{modulAjar:['recMOD0000000010a'],bab:['Bab 1 - Cinta Kasih Allah','ngawur']}});ok(!r.j.kurang.some(k=>/ajar/.test(k))&&r.j.profil.modulAjar.length===1&&r.j.profil.bab.length===0,'modul tersimpan, bab diabaikan');
 r=await call('POST',{},{act:'simpan',data:{pelayanan:['recPL40000000010a']}});ok(r.j.profil.modulAjar.length===0&&r.j.profil.bab.length===0&&!r.j.kurang.some(k=>/ajar/.test(k)),'lepas Pewarta -> modul/bab dikosongkan');
 r=await call('POST',{},{act:'foto',file:'data:image/jpeg;base64,/9j/4AAQ'});ok(r.j&&r.j.ok&&r.j.profil.foto&&!r.j.kurang.length,'foto terunggah -> profil lengkap');
 r=await call('POST',{},{act:'foto',file:'data:text/html;base64,AAAA'});ok(r.s===400,'foto non-gambar ditolak');
 r=await call('GET',{act:'kota',q:'suraba'});ok(r.j.kota.length===1,'cari kota');
 r=await call('GET',{act:'paroki',kus:'recBPK0000000001a'});ok(r.j.paroki.length===1,'daftar paroki');
 r=await call('GET',{act:'pd',kus:'recBPK0000000001a'});ok(r.j.pd.length===1,'daftar PD');
 // PD baru
 r=await call('POST',{},{act:'pdbaru',data:{nama:'PD Santa Maria',kus:'recBPK0000000001a',jenis:'PD Umum',koordNama:'Maria K',koordWa:'0812 9999 0000'}});
 ok(r.j&&r.j.ok&&!r.j.digabung&&db[T.PD].length===2&&mails.length===1&&db[T.ANT].length===1,'PD baru dibuat + email + antrian');
 const koordPer=db[T.PER].find(p=>p.fields.fldVU2gofcKEhWHmB==='Maria K');ok(!!koordPer&&db[T.PD][1].fields.fldxlRQG4ikb8coP2[0]===koordPer.id,'koordinator baru dibuat & ditautkan');
 r=await call('POST',{},{act:'pdbaru',data:{nama:'Persekutuan Doa Santa Maria',kus:'recBPK0000000001a',jenis:'PD Umum',koordNama:'Maria K',koordWa:'6281299990000'}});
 ok(r.j.digabung&&db[T.PD].length===2&&mails.length===1,'PD mirip digabung, tidak dobel, tanpa email baru');
 ok(db[T.PER].filter(p=>p.fields.fldVU2gofcKEhWHmB==='Maria K').length===1,'koordinator tidak dobel (cocok nomor WA)');
 r=await call('POST',{},{act:'pdbaru',data:{nama:'pd yosef',kus:'recBPK0000000001a',jenis:'PD Umum',koordNama:'Joko',koordWa:'0813 1111 2222'}});
 ok(r.j.digabung&&r.j.pd.id==='recPD00000000001a'&&db[T.PD][0].fields.fldxlRQG4ikb8coP2.length===1&&mails.length===2,'PD lama tanpa koordinator: digabung + koordinator diisi + email koordinator baru');
 r=await call('POST',{},{act:'pdbaru',data:{nama:'PD X',kus:'recBPK0000000001a',jenis:'PD Umum',koordNama:'K',koordWa:'12'}});ok(r.s===400,'WA koordinator tidak valid ditolak');
 r=await call('POST',{},{act:'parokibaru',data:{nama:'Paroki Santo Yosef',kus:'recBPK0000000001a'}});ok(r.j.digabung,'paroki mirip digabung');
 r=await call('POST',{},{act:'parokibaru',data:{nama:'Paroki Kristus Raja',kus:'recBPK0000000001a'}});ok(r.j.ok&&!r.j.digabung&&db[T.PAR].length===2,'paroki baru dibuat');
 // orang lain
 r=await call('GET',{id:'recOTH000000000a1'});ok(r.s===403,'non-admin tak boleh lihat profil orang lain');
 ACC={...ACC,peran:'Admin'};r=await call('GET',{id:'recOTH000000000a1'});ok(r.j&&r.j.profil.id==='recOTH000000000a1'&&r.j.milik===false,'Admin boleh lihat profil orang lain');
 r=await call('POST',{},{act:'simpan',id:'recOTH000000000a1',data:{pan:'Ol'}});ok(r.j&&r.j.ok&&db[T.PER][1].fields.fldstVCm8Oa3tyxNA==='Ol','Admin boleh ubah profil orang lain');
 ACC={...ACC,peran:'Editor BPN'};r=await call('POST',{},{act:'simpan',id:'recOTH000000000a1',data:{pan:'Ol2'}});ok(r.j&&r.j.ok,'Editor boleh ubah profil orang lain');
 ACC={...ACC,peran:'PIC BPK',pending:true};r=await call('GET');ok(r.s===403,'akun pending ditolak');
})();
