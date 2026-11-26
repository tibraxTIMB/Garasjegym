// Native OOXML, generated locally without macros or external links.
const encoder=new TextEncoder(),H='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
const S='http://schemas.openxmlformats.org/spreadsheetml/2006/main',R='http://schemas.openxmlformats.org/officeDocument/2006/relationships',C='http://schemas.openxmlformats.org/drawingml/2006/chart',A='http://schemas.openxmlformats.org/drawingml/2006/main',X='http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing'
const xml=v=>String(v??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
const rel=(i,t,p)=>'<Relationship Id="rId'+i+'" Type="'+R+'/'+t+'" Target="'+p+'"/>'
const rels=x=>H+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+x+'</Relationships>'
const num=x=>x==null||x===''||!Number.isFinite(Number(x))?null:Number(x)
const date=x=>({v:Date.parse(x+'T00:00:00Z')/86400000+25569,s:2}),f=(formula,s=0)=>({formula,s}),styled=v=>({v,s:1})
function cell(x,r,j){
 const a=String.fromCharCode(65+j)+r,p=x&&typeof x==='object'?x:{v:x},st=p.s?' s="'+p.s+'"':''
 if(p.formula)return '<c r="'+a+'"'+st+'><f>'+xml(p.formula)+'</f><v></v></c>'
 if(p.v==null||p.v==='')return '<c r="'+a+'"'+st+'/>'
 return typeof p.v==='number'&&Number.isFinite(p.v)?'<c r="'+a+'"'+st+'><v>'+p.v+'</v></c>':'<c r="'+a+'" t="inlineStr"'+st+'><is><t xml:space="preserve">'+xml(p.v)+'</t></is></c>'
}
function sheet(rows,widths,filter=false,extra=''){
 const last=String.fromCharCode(64+widths.length)+Math.max(rows.length,2)
 return H+'<worksheet xmlns="'+S+'" xmlns:r="'+R+'"><dimension ref="A1:'+last+'"/><sheetViews><sheetView workbookViewId="0">'+(filter?'<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>':'')+'</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>'+widths.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join('')+'</cols><sheetData>'+rows.map((row,i)=>'<row r="'+(i+1)+'">'+row.map((v,j)=>cell(i===0&&filter?styled(v):v,i+1,j)).join('')+'</row>').join('')+'</sheetData>'+(filter?'<autoFilter ref="A1:'+last+'"/>':'')+extra+'</worksheet>'
}
const crcTable=Array.from({length:256},(_,x)=>{for(let i=0;i<8;i++)x=(x&1)?0xedb88320^(x>>>1):x>>>1;return x>>>0})
function crc(a){let x=0xffffffff;for(const b of a)x=crcTable[(x^b)&255]^(x>>>8);return (x^0xffffffff)>>>0}
export function zipStore(entries){
 let offset=0;const local=[],central=[]
 for(const [name,value] of Object.entries(entries)){
  const k=encoder.encode(name),b=typeof value==='string'?encoder.encode(value):value,sum=crc(b)
  const h=new Uint8Array(30+k.length),v=new DataView(h.buffer),d=new Uint8Array(46+k.length),w=new DataView(d.buffer)
  v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,33,true);v.setUint32(14,sum,true);v.setUint32(18,b.length,true);v.setUint32(22,b.length,true);v.setUint16(26,k.length,true);h.set(k,30)
  w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint16(8,0x800,true);w.setUint16(14,33,true);w.setUint32(16,sum,true);w.setUint32(20,b.length,true);w.setUint32(24,b.length,true);w.setUint16(28,k.length,true);w.setUint32(42,offset,true);d.set(k,46)
  local.push(h,b);central.push(d);offset+=h.length+b.length
 }
 const size=central.reduce((s,b)=>s+b.length,0),end=new Uint8Array(22),e=new DataView(end.buffer)
 e.setUint32(0,0x06054b50,true);e.setUint16(8,central.length,true);e.setUint16(10,central.length,true);e.setUint32(12,size,true);e.setUint32(16,offset,true)
 if(offset+size+22>100000000||central.length>65535)throw Error('Vel eit kortare eksporttidsrom.')
 const out=new Uint8Array(offset+size+22);let p=0;for(const b of [...local,...central,end]){out.set(b,p);p+=b.length}return out
}
const styles=H+'<styleSheet xmlns="'+S+'"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd.mm.yyyy"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF243C48"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'
const escCrit=ref=>'"="&SUBSTITUTE(SUBSTITUTE(SUBSTITUTE('+ref+',"~","~~"),"*","~*"),"?","~?")'
const crit=ref=>'IF('+ref+'="Alle","*",'+escCrit(ref)+')'
const serie=(i,label,col)=>'<c:ser><c:idx val="'+i+'"/><c:order val="'+i+'"/><c:tx><c:v>'+xml(label)+'</c:v></c:tx><c:cat><c:numRef><c:f>Belastning!$A$2:$A$32</c:f></c:numRef></c:cat><c:val><c:numRef><c:f>Belastning!$'+col+'$2:$'+col+'$32</c:f></c:numRef></c:val></c:ser>'
function chart(series,line=false){
 const type=line?'lineChart':'barChart',opts=line?'<c:grouping val="standard"/>':'<c:barDir val="col"/><c:grouping val="clustered"/>'
 return H+'<c:chartSpace xmlns:c="'+C+'" xmlns:a="'+A+'"><c:chart><c:plotArea><c:layout/><c:'+type+'>'+opts+series+'<c:axId val="101"/><c:axId val="102"/></c:'+type+'><c:catAx><c:axId val="101"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="b"/><c:numFmt formatCode="dd.mm" sourceLinked="0"/><c:crossAx val="102"/><c:crosses val="autoZero"/><c:auto val="1"/></c:catAx><c:valAx><c:axId val="102"/><c:scaling><c:orientation val="minMax"/><c:min val="0"/></c:scaling><c:axPos val="l"/><c:majorGridlines/><c:crossAx val="101"/><c:crosses val="autoZero"/></c:valAx></c:plotArea><c:legend><c:legendPos val="b"/><c:layout/></c:legend><c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart></c:chartSpace>'
}
const marker=(tag,row,col)=>'<xdr:'+tag+'><xdr:col>'+col+'</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>'+row+'</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:'+tag+'>'
const anchor=(id,row)=>'<xdr:twoCellAnchor>'+marker('from',row,3)+marker('to',row+15,12)+'<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="'+id+'" name="Chart '+id+'"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="'+C+'"><c:chart xmlns:c="'+C+'" r:id="rId'+id+'"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>'
export function workoutXlsx(data,from,to){
 const {logs,exercises,sets}=data.records||{}
 if(!Array.isArray(logs)||!Array.isArray(exercises)||!Array.isArray(sets)||!Number.isFinite(date(from).v)||!Number.isFinite(date(to).v)||from>to)throw Error('Ugyldig eksportutval.')
 const lm=new Map(logs.map(l=>[l.id,l])),em=new Map(exercises.map(e=>[e.id,e]))
 if(exercises.some(e=>!lm.has(e.workout_log_id))||sets.some(s=>!em.has(s.workout_exercise_id)))throw Error('Ufullstendig øktkopling.')
 const names=[...new Set(exercises.map(e=>e.exercise_name).filter(Boolean))].sort(),formats=[...new Set(logs.map(l=>l.format).filter(Boolean))].sort()
 const wr=[['Økt-ID','Dato','Namn','Format','Rundar','Reps','Resultattid sek','Resultatvekt kg','Kaloriar','Distanse','Eining'],...logs.map(l=>[l.id,date(l.workout_date),l.title,l.format,num(l.score_rounds),num(l.score_reps),num(l.score_time_seconds),num(l.score_load_kg),num(l.score_calories),num(l.score_distance),l.score_unit])]
 const sr=[['Økt-ID','Dato','Økt','Format','Øving','Sett','Reps','Kg','Høgd cm','Tid sek','Dokumentert reps × kg'],...sets.map((s,i)=>{const e=em.get(s.workout_exercise_id),l=lm.get(e.workout_log_id),r=i+2;return [l.id,date(l.workout_date),l.title,l.format,e.exercise_name,num(s.set_number),num(s.reps),num(s.load_kg),num(s.height_cm),num(s.time_seconds),f('IF(AND(ISNUMBER(G'+r+'),ISNUMBER(H'+r+')),G'+r+'*H'+r+',"")')]})]
 const L=c=>'Oktlogg!$'+c+'$2:$'+c+'$'+Math.max(2,wr.length),Q=c=>'Settlogg!$'+c+'$2:$'+c+'$'+Math.max(2,sr.length)
 const filter=(range,lo,hi,ex)=>range('B')+',">="&'+lo+','+range('B')+',"<="&'+hi+','+range('D')+','+crit('Dashboard!$B$6')+(ex?','+range('E')+','+crit('Dashboard!$B$5'):'')
 const lf=filter(L,'$B$3','$B$4',false),sf=filter(Q,'$B$3','$B$4',true)
 const dash=[[styled('EXPORTWERK 49 · treningsanalyse')],['Vel dato, øving og format.'],['Frå',date(from)],['Til',date(to)],['Øving','Alle'],['Format','Alle'],['Økter (alle øvingar)',f('COUNTIFS('+lf+')')],['Registrerte sett',f('COUNTIFS('+sf+')')],['Registrerte reps',f('SUMIFS('+Q('G')+','+sf+')')],['Dokumentert reps × kg',f('SUMIFS('+Q('K')+','+sf+')')],['Diagram: siste 31 dagar av vald periode.'],['Vektvolum = rapporterte reps × kg.'],['Ingen antaking om bilateral vekt eller kroppsvekt.'],['Resultattid er ikkje automatisk øktvarigheit.']]
 const work=[['Dato','Sett','Reps × kg','7 dagar kg','28 dagar kg']]
 for(let i=0;i<31;i++){const r=i+2,day='A'+r,fi=filter(Q,day,day,true),sum=days=>filter(Q,'MAX(Dashboard!$B$3,'+day+'-'+(days-1)+')',day,true),guard=calc=>f('IF('+day+'<Dashboard!$B$3,NA(),'+calc+')')
  work.push([f('Dashboard!$B$4-'+(30-i),2),guard('COUNTIFS('+fi+')'),guard('SUMIFS('+Q('K')+','+fi+')'),guard('SUMIFS('+Q('K')+','+sum(7)+')'),guard('SUMIFS('+Q('K')+','+sum(28)+')')])
 }
 const strength=[['Øving','Registrerte sett','Reps','Dokumentert reps × kg'],...names.map((name,i)=>{const r=i+2,fi=filter(Q,'Dashboard!$B$3','Dashboard!$B$4',false)+','+Q('E')+','+escCrit('A'+r);return [name,f('COUNTIFS('+fi+')'),f('SUMIFS('+Q('G')+','+fi+')'),f('SUMIFS('+Q('K')+','+fi+')')]})]
 const used=new Set(sets.map(s=>s.workout_exercise_id))
 const quality=[['Datakvalitet','Tal'],['Økter',logs.length],['Øvingar',exercises.length],['Sett',sets.length],['Sett utan reps',sets.filter(s=>num(s.reps)==null).length],['Sett utan kg',sets.filter(s=>num(s.load_kg)==null).length],['Øvingar utan sett',exercises.filter(e=>!used.has(e.id)).length],['Merk','Tomme målingar vert ikkje erstatta med 0.']]
 const lists=[['Øving','Format'],['Alle','Alle'],...Array.from({length:Math.max(names.length,formats.length)},(_,i)=>[names[i]||'',formats[i]||''])]
 const validation='<dataValidations count="2"><dataValidation type="list" allowBlank="0" showErrorMessage="1" sqref="B5"><formula1>ExerciseList</formula1></dataValidation><dataValidation type="list" allowBlank="0" showErrorMessage="1" sqref="B6"><formula1>FormatList</formula1></dataValidation></dataValidations><drawing r:id="rId1"/>'
 const sheets=[['Dashboard',sheet(dash,[48,20,4],false,validation)],['Oktlogg',sheet(wr,[38,14,32,18,12,12,18,18,12,16,14],true)],['Settlogg',sheet(sr,[38,14,32,18,32,9,9,12,12,12,25],true)],['Styrke',sheet(strength,[38,18,16,25],true)],['Belastning',sheet(work,[14,12,20,20,20],true)],['Datakvalitet',sheet(quality,[35,60],true)],['Lister',sheet(lists,[36,25],true)]]
 const types=sheets.map((_,i)=>['/xl/worksheets/sheet'+(i+1)+'.xml','spreadsheetml.worksheet']).concat([['/xl/workbook.xml','spreadsheetml.sheet.main'],['/xl/styles.xml','spreadsheetml.styles'],['/xl/drawings/drawing1.xml','drawing'],['/xl/charts/chart1.xml','drawingml.chart'],['/xl/charts/chart2.xml','drawingml.chart']])
 const mime=t=>'application/vnd.openxmlformats-officedocument.'+t+'+xml'
 const entries={
 '[Content_Types].xml':H+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'+types.map(([p,t])=>'<Override PartName="'+p+'" ContentType="'+mime(t)+'"/>').join('')+'</Types>',
 '_rels/.rels':rels(rel(1,'officeDocument','xl/workbook.xml')),
 'xl/workbook.xml':H+'<workbook xmlns="'+S+'" xmlns:r="'+R+'"><bookViews><workbookView activeTab="0"/></bookViews><sheets>'+sheets.map(([name],i)=>'<sheet name="'+name+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets><definedNames><definedName name="ExerciseList">Lister!$A$2:$A$'+(names.length+2)+'</definedName><definedName name="FormatList">Lister!$B$2:$B$'+(formats.length+2)+'</definedName></definedNames><calcPr calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>',
 'xl/_rels/workbook.xml.rels':rels(sheets.map((_,i)=>rel(i+1,'worksheet','worksheets/sheet'+(i+1)+'.xml')).join('')+rel(sheets.length+1,'styles','styles.xml')),
 'xl/styles.xml':styles,
 'xl/worksheets/_rels/sheet1.xml.rels':rels(rel(1,'drawing','../drawings/drawing1.xml')),
 'xl/drawings/drawing1.xml':H+'<xdr:wsDr xmlns:xdr="'+X+'" xmlns:a="'+A+'" xmlns:r="'+R+'">'+anchor(1,1)+anchor(2,17)+'</xdr:wsDr>',
 'xl/drawings/_rels/drawing1.xml.rels':rels(rel(1,'chart','../charts/chart1.xml')+rel(2,'chart','../charts/chart2.xml')),
 'xl/charts/chart1.xml':chart(serie(0,'Dokumentert reps × kg','C')),
 'xl/charts/chart2.xml':chart(serie(0,'7 dagar','D')+serie(1,'28 dagar','E'),true)}
 sheets.forEach((s,i)=>entries['xl/worksheets/sheet'+(i+1)+'.xml']=s[1])
 return zipStore(entries)
}
