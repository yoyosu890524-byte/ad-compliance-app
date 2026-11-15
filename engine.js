'use strict';
// ================= 規則引擎 =================
const NUTR=[ // 附件二營養素主詞辨識
 ['維生素 A 或 β-胡蘿蔔素','維生素\\s*A|維他命\\s*A|vitamin\\s*A|β-?胡蘿蔔素|beta-?carotene'],['維生素 D','維生素\\s*D\\d?|維他命\\s*D\\d?|vitamin\\s*D'],['維生素 E','維生素\\s*E|維他命\\s*E|vitamin\\s*E'],
 ['維生素 K','維生素\\s*K\\d?|維他命\\s*K\\d?|vitamin\\s*K'],['維生素 C','維生素\\s*C|維他命\\s*C|vitamin\\s*C'],['維生素 B1','維生素\\s*B1(?!\\d)|維他命\\s*B1(?!\\d)|硫胺'],['維生素 B2','維生素\\s*B2|維他命\\s*B2|核黃素'],
 ['菸鹼素','菸鹼素|菸鹼酸|維生素\\s*B3'],['維生素 B6','維生素\\s*B6|維他命\\s*B6'],['葉酸','葉酸'],['維生素 B12','維生素\\s*B12|維他命\\s*B12'],['生物素','生物素|維生素\\s*B7'],['泛酸','泛酸|維生素\\s*B5'],
 ['鈣','鈣(?!化)'],['鐵','鐵(?!觀音)'],['碘','碘'],['鎂','鎂'],['鋅','鋅'],['鉻','鉻'],['硒','硒'],['蛋白質','蛋白質|乳清蛋白|大豆蛋白'],['膳食纖維','膳食纖維|纖維']];
const HF14=['骨質保健','調節血脂','胃腸功能改善','免疫調節','牙齒保健','護肝','調節血糖','延緩衰老','抗疲勞','輔助調節血鐵','促進鐵吸收','輔助調節血壓','不易形成體脂肪','輔助調整過敏體質','膝關節保健'];
const HF14RE={'護肝':'護肝|保肝|保護肝臟','胃腸功能改善':'胃腸功能改善|改善胃腸功能','免疫調節':'免疫調節|調節免疫','抗疲勞':'抗疲勞|消除疲勞','輔助調節血壓':'輔助調節血壓|調節血壓','輔助調整過敏體質':'輔助調整過敏體質|調整過敏體質','膝關節保健':'膝關節保健|關節保健','輔助調節血鐵':'輔助調節血鐵','促進鐵吸收':'促進鐵吸收(?:功能)?'};
const fixCJK=s=>String(s||'').replace(/[\u2E80-\u2FDF\uF900-\uFAFF]/g,c=>c.normalize('NFKC'));
const strip=s=>s.replace(/[。．\s]/g,'');
function sentAt(text,i,j){let a=i,b=j;while(a>0&&!/[。！？!?\n；;]/.test(text[a-1]))a--;while(b<text.length&&!/[。！？!?\n；;]/.test(text[b]))b++;return [a,b]}
function scan(text,ctx){const F=[];if(!text||!text.trim())return F;const add=(o)=>F.push(o);
 const rules=RULES.R.filter(r=>!r.mode||r.mode===ctx.mode);if(ctx.mode==='health')rules.sort((a,b)=>(b.id==='R08')-(a.id==='R08'));
 // 1) 健康食品：保健功效範圍
 if(ctx.mode==='health'){const lic=ctx.lic,ok=lic?lic[7]:'';
  for(const k of HF14){const re=new RegExp(HF14RE[k]||k,'g');let m;while((m=re.exec(text))){const inLic=lic&&ok.includes(k);
   add(inLic?{tier:'blue',cat:'核准保健功效',s:m.index,e:m.index+m[0].length,q:m[0],basis:'健康食品管理法 §14；許可證 '+lic[0]+' 核准功效「'+lic[7]+'」',why:'屬許可證核准之保健功效項目，請依核准宣稱原文完整呈現並標示警語。',fix:['宣稱原文：'+(lic[8]||'').replace(/\s+/g,' ')],src:'規則',rid:'HF-OK'}
    :{tier:'red',cat:lic?'超出核准保健功效範圍':'健康食品未指定許可證',s:m.index,e:m.index+m[0].length,q:m[0],basis:RULES.B.hfs,why:lic?'此許可證核准功效為「'+lic[7]+'」，「'+k+'」不在核准範圍內。':'尚未選擇小綠人許可證，無法確認此保健功效是否經核准。',fix:lic?['刪除「'+m[0]+'」，僅依核准功效「'+lic[7]+'」原文宣稱。']:['請在「產品身分」選擇許可證字號以比對核准功效。'],rep:'',src:'規則',rid:'HF-OUT'})}}
  if(lic){const claims=(lic[8]||'').replace(/[「」『』"]/g,'').split(/\n|(?<=。)|；/).map(s=>s.replace(/^\s*[\d一二三四五六七八九十]+[.、．)]\s*/,'').replace(/^經[^：:]{0,12}[：:]/,'').replace(/[。\s]/g,'')).filter(s=>s.length>=6);
   for(const c of claims){let i=strip(text).indexOf(c);if(i<0)continue;const p=text.indexOf(c);if(p>=0)add({tier:'blue',cat:'核准功效宣稱原文',s:p,e:p+c.length,q:c,basis:'健康食品管理法 §14；許可證 '+lic[0]+' 核准之保健功效宣稱',why:'與許可證核准宣稱原文一致。',fix:[],src:'規則',rid:'HF-CLAIM'})}
   if(!/(衛部|衛署)健食(規)?字第/.test(text))add({tier:'yellow',cat:'未見許可證字號',s:-1,e:-1,q:'（全文）',basis:'健康食品管理法 §13（應標示許可證字號、「健康食品」字樣及標準圖樣、核准功效、警語）；輔導指引 陸',why:'文案中未見「衛部（署）健食字第○○號」，建議完整呈現許可證字號、核准功效與警語，以利辨識。',fix:['加註：'+lic[0]+'，並附警語：'+(lic[9]||'').replace(/\s+/g,' ').slice(0,120)],src:'規則',rid:'HF-NO'});
   if(lic[5]!=='核可')add({tier:'red',cat:'許可證非有效狀態',s:-1,e:-1,q:'（全文）',basis:'健康食品管理法 §6、§21',why:'許可證 '+lic[0]+' 目前證況為「'+lic[5]+'」，不得以健康食品名義廣告。',fix:['請確認許可證狀態，或改以一般食品身分審核文案。'],src:'規則',rid:'HF-ST'})}}
 // 2) 紅／黃規則
 for(const r of rules){const re=new RegExp(r.re,'gi');let m;while((m=re.exec(text))){if(!m[0])break;add({tier:r.tier,cat:r.cat,s:m.index,e:m.index+m[0].length,q:m[0],basis:r.basis,why:r.why,fix:r.fix,rep:r.rep,src:'規則',rid:r.id})}}
 // 3) 附件一（藍線）
 for(const p of KB.att1){let i=-1;while((i=text.indexOf(p,i+1))>=0)add({tier:'blue',cat:'附件一 通常可使用之詞句',s:i,e:i+p.length,q:p,basis:RULES.B.a1,why:'屬認定準則附件一「通常可使用之詞句」，不認定為不實誇張易生誤解。',fix:[],src:'規則',rid:'A1'})}
 // 4) 附件二（營養素生理功能）
 for(const g of KB.att2)for(const ph of g.phrases){const p=ph.replace(/[。]/g,''),core=p.replace(/^(有助於|有助|幫助|增進|促進)/,'');
  const re=new RegExp(core.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/，/g,'[，,]?'),'g');let m;
  while((m=re.exec(text))){const [a,b]=sentAt(text,m.index,m.index+m[0].length),sent=text.slice(a,b);
   const own=NUTR.find(n=>n[0]===g.nutrient),hasOwn=own&&new RegExp(own[1],'i').test(sent);
   const declared=ctx.nutr.includes(g.nutrient);
   let tier='blue',why='屬附件二「'+g.nutrient+'」得敘述之生理功能詞句'+(declared&&ctx.nutrOK?'，且已確認含量符合規定。':'。'),fix=[];
   if(!hasOwn){const other=NUTR.filter(n=>new RegExp(n[1],'i').test(sent)).map(n=>n[0]);
    if(other.length&&!KB.att2.some(x=>other.includes(x.nutrient)&&x.phrases.some(y=>y.replace(/。/g,'').includes(core)))){tier='yellow';why='此句寫的是「'+other.join('、')+'」，但依附件二，這句生理功能屬於「'+g.nutrient+'」，易使消費者誤認（指引伍-六 維生素D3＋K2 案例）。';fix=['把主詞改成正確的營養素：「'+g.nutrient+p+'」，或刪除。']}
    else if(!other.length){tier='yellow';why='未寫明是哪一種營養素的生理功能，易被誤認為產品本身或複方的功效（附件二註三、指引伍-六）。';fix=['補上營養素主詞，例如「本產品所含'+g.nutrient.replace(' 或 β-胡蘿蔔素','')+p+'」，並確認含量符合規定。']}
    else continue}
   else if(!(declared&&ctx.nutrOK)){tier='yellow';why='「'+g.nutrient+'」的生理功能詞句，須該營養素含量符合「包裝食品營養宣稱應遵行事項」等規定才能使用（附件二註一'+(g.nutrient==='鉻'?'、註二：鉻每日最低攝取量需達 6μg':'')+'）。尚未在產品身分中確認含量。';fix=['確認含量後，在「產品身分 › 營養素」勾選「'+g.nutrient+'」與「含量符合規定」，此句即為藍線。','若含量不足，請刪除此句。']}
   add({tier,cat:'附件二 營養素生理功能',s:m.index,e:m.index+m[0].length,q:m[0],basis:RULES.B.a2,why,fix,rep:tier==='yellow'?m[0]:undefined,src:'規則',rid:'A2'})}}
 return dedupe(F)}
function dedupe(F){const pr={red:3,yellow:2,blue:1};F.sort((a,b)=>(pr[b.tier]-pr[a.tier])||((b.e-b.s)-(a.e-a.s)));const out=[];
 for(const f of F){if(f.s<0){if(!out.some(o=>o.rid===f.rid))out.push(f);continue}if(out.some(o=>o.s>=0&&o.s<f.e&&f.s<o.e))continue;out.push(f)}
 return out.sort((a,b)=>a.s-b.s)}


if(typeof window!=='undefined'){Object.assign(window,{scan,dedupe,sentAt,fixCJK,NUTR,HF14})}
