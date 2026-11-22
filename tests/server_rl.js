process.env.SESSION_SECRET='x'.repeat(40); process.env.AIRTABLE_TOKEN='t';
const root=require('path').resolve(__dirname,'..')+'/'; const U=require(root+'lib/users.js'); const {F,T}=U; const R0=require(root+'lib/roles.js'); const RT=R0.RT;
const PER='tbl21zOSogH7Anlu2';
const role=(id,o)=>({id,fields:{[RT.nama]:o.n,[RT.hak]:JSON.stringify(o.hak||{}),[RT.cak]:o.cak,[RT.seksi]:o.seksi||'',[RT.tingkat]:o.tg,[RT.kat]:o.kat,[RT.sistem]:!!o.sis}});
const tim=(id,pid,sk,kat,jab,st='AKTIF')=>({id,fields:{fldomDq2DVSouEZRg:[pid],fldo7LnqytWDz29ph:sk,fldPcVBoJjOxvmm60:sk,fldt3z2Ne2c4V9WYC:kat,flddq43aR0XsimTjg:st,fldXQjbXYwlQGFkXH:jab}});
const db={
 [RT.t]:[role('recROLE000000001',{n:'Koordinator – Tim Kerja Dana',cak:'Nasional',seksi:'Tim Kerja Dana',tg:'Koordinator',hak:{dashboard:'view',proker:'edit','proker/semua':'edit',admin:'edit'}}),
         role('recROLE000000002',{n:'Anggota – Tim Kerja Dana',cak:'Terbatas',seksi:'Tim Kerja Dana',tg:'Anggota',hak:{dashboard:'view',tim:'view'}}),
         role('recROLE000000003',{n:'Pengamat',sis:true,cak:'Terbatas',hak:{umat:'edit'}})],
 [R0.TIM_T||'tblDpFOHsHMntZwWk']:[tim('recTIM0000000001','recP00000000000A1',['Tim Kerja Dana'],'TIM KERJA',['Koordinator Seksi Dana']),tim('recTIM0000000002','recP00000000000A2',['Tim Kerja Dana'],'TIM KERJA',[]),tim('recTIM0000000003','recP00000000000A3',['Tim Kerja Dana'],'TIM KERJA',[],'SELESAI')],
 'tblRzqA9mzvDBWgSZ':[], 'tblhmeuR1qFHxUIId':[],
 [PER]:[{id:'recP00000000000A1',fields:{}},{id:'recP00000000000A2',fields:{}},{id:'recP00000000000A3',fields:{}},{id:'recP00000000000A4',fields:{}}]};
const u=(id,person,o={})=>({id,fields:{[F.aktif]:true,[F.disetujui]:true,[F.email]:id+'@x.id',[F.nama]:id,[F.person]:person,'fldsTal4cl44WawC3':o.peran,'fld7LeP24BReQjdFA':o.manual?JSON.stringify(o.manual):undefined}});
db[T]=[u('recU0000000000001','recP00000000000A1'),u('recU0000000000002','recP00000000000A2'),u('recU0000000000003','recP00000000000A3',{manual:['Pengamat']}),u('recU0000000000004','recP00000000000A4',{manual:['Pengamat','Koordinator – Tim Kerja Dana']}),u('recU0000000000005','recP00000000000A4',{manual:['Admin']}),u('recU0000000000006','recP00000000000A4',{manual:['Super Admin','Pengamat']})];
const match=(rows,f)=>{let m; if(!f) return rows; if((m=f.match(/RECORD_ID\(\)='(\w+)'/))) return rows.filter(r=>r.id===m[1]); return rows;};
require.cache[require.resolve(root+'lib/airtable.js')]={id:'a',filename:'a',loaded:true,exports:{fetchAll:async(t,fl,ex={})=>match(db[t]||[],ex.filterByFormula),listByIds:async()=>[],update:async()=>{},create:async()=>({id:'x'}),remove:async()=>{},BASE:'x'}};
delete require.cache[require.resolve(root+'lib/roles.js')]; const R1=require(root+'lib/roles.js'); const A=require(root+'lib/access.js'); const ok=(c,m)=>console.log(c?'OK  ':'FAIL',m);
(async()=>{
 const g=(i)=>A.getAccess({rid:i});
 const k=await g('recU0000000000001'); ok(k.roles.join()==='Koordinator – Tim Kerja Dana'&&k.perm.proker===2&&k.perm['proker/semua']===2&&k.perm.dashboard===1,'otomatis: koordinator seksi Dana mendapat role');
 ok(k.perm.admin===0&&k.perm['admin/role']===0,'role non-admin tidak bisa membuka Administrasi walau dicentang');
 ok(k.nasional===true,'cakupan Nasional dari role');
 const a=await g('recU0000000000002'); ok(a.roles.join()==='Anggota – Tim Kerja Dana'&&a.perm.proker===0&&a.perm.tim===1&&a.nasional===false,'anggota seksi: hanya hak anggota (bukan koordinator)');
 const x=await g('recU0000000000003'); ok(x.roles.join()==='Pengamat'&&x.perm.umat===2&&x.perm.dashboard===1===false||x.perm.umat===2,'tim SELESAI tidak memberi role; hak role Pengamat ditimpa Admin (umat edit)');
 const m=await g('recU0000000000004'); ok(m.perm.umat===2&&m.perm.proker===2&&m.perm.dashboard===1,'bentrok: ambil tertinggi per menu');
 const ad=await g('recU0000000000005'); ok(ad.peran==='Admin'&&ad.perm.admin===2&&ad.perm['admin/role']===2,'Admin bisa Administrasi');
 const sa=await g('recU0000000000006'); ok(sa.peran==='Admin'&&sa.perm['admin/role']===2,'Super Admin = Admin');
})();
setTimeout(async()=>{const k=await A.getAccess({rid:'recU0000000000001'}); for (const i of ['01','02','03','04']) { const z=await A.getAccess({rid:'recU00000000'+i+'00'.slice(0,0)}); } const ad=await A.getAccess({rid:'recU0000000000005'}); console.log(JSON.stringify({roles:ad.roles,peran:ad.peran,adm:ad.perm.admin,pend:ad.pending,must:ad.mustChange}));},300);
setTimeout(async()=>{for(const i of ['1','2','3','4']){const z=await A.getAccess({rid:'recU000000000000'.slice(0,15-1)+i}); console.log('U'+i, z&&JSON.stringify({r:z.roles,t:z.perm.tim,pk:z.perm.proker,u:z.perm.umat,d:z.perm.dashboard}));}},500);
setTimeout(async()=>{for(const r of db[T].slice(0,4)){const z=await A.getAccess({rid:r.id}); console.log('Z',r.id,r.id.length, z&&JSON.stringify({r:z.roles,t:z.perm.tim,pk:z.perm.proker,u:z.perm.umat,d:z.perm.dashboard}));} const tm=await R1.loadTim(); console.log('TIM',JSON.stringify(tm)); console.log('ROLES',JSON.stringify(await R1.loadRoles()).slice(0,300));},800);
setTimeout(()=>{R1.loadRoles().then(r=>console.log('ROLESOK',r.length)).catch(e=>console.log('ROLESERR',e.stack.split('\n').slice(0,3).join('|')));R1.loadTim().then(r=>console.log('TIMOK',JSON.stringify(r))).catch(e=>console.log('TIMERR',e.message));},100);
