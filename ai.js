// AI 深度審核核心（瀏覽器與 Node 測試共用）：提示詞、呼叫、片段定位、潤飾流程
(function(G){'use strict';
const KB=G.KB;
// ---------- 法規條文（取自內建官方資料） ----------
function art(law,no){const l=KB.laws.find(x=>x.name.startsWith(law));const a=l&&l.articles.find(x=>x.no===no);return a?a.text:''}
const a28=art('食品安全衛生管理法','第 28 條').split('。'),a4=art('食品及相關產品','第 4 條'),a5=art('食品及相關產品','第 5 條'),h6=art('健康食品管理法','第 6 條').split('。'),h14=art('健康食品管理法','第 14 條');
const LAWS={
 'FSA28-1':{name:'食品安全衛生管理法第28條第1項',text:a28[0]+'。'},
 'FSA28-2':{name:'食品安全衛生管理法第28條第2項',text:a28[1]+'。'},
 'STD4':{name:'食品及相關產品標示宣傳廣告涉及不實誇張易生誤解或醫療效能認定準則第4條',text:a4.split('食品以「健康」')[0].trim()},
 'STD5':{name:'食品及相關產品標示宣傳廣告涉及不實誇張易生誤解或醫療效能認定準則第5條',text:a5},
 'HFA6':{name:'健康食品管理法第6條第1項',text:h6[0]+'。'},
 'HFA14':{name:'健康食品管理法第14條',text:h14},
};
const PEN={red:'罰則：食安法第45條，新臺幣60萬元以上500萬元以下罰鍰',yellow:'罰則：食安法第45條，新臺幣4萬元以上400萬元以下罰鍰'};
function lawText(codes){return (codes||[]).filter(c=>LAWS[c]).map(c=>LAWS[c].name+'：'+LAWS[c].text)}
// ---------- 提示詞 ----------
function ctxLine(ctx){return ctx.mode==='health'?'健康食品'+(ctx.lic?`，許可證 ${ctx.lic[0]}「${ctx.lic[2]}」（證況：${ctx.lic[5]}），核准保健功效：${ctx.lic[7]}；核准宣稱原文：${ctx.lic[8]}`:'（未指定許可證）'):'一般食品（非健康食品，不得宣稱任何保健功效或療效）'}
function auditSystem(ctx){const a2=KB.att2.map(g=>g.nutrient+'：'+g.phrases.map(p=>p.replace(/。/g,'')).join('；')).join('\n');
return `你是台灣衛生局食品廣告稽查人員兼資深合規文案編輯，依《食品安全衛生管理法》第28條、《健康食品管理法》第6、14條、《食品及相關產品標示宣傳廣告涉及不實誇張易生誤解或醫療效能認定準則》（下稱認定準則）及食藥署《食品廣告合規輔導指引》（115.05.18）審核廣告。以繁體中文（台灣用語）回答。

【審核原則：依整體表現綜合判斷（認定準則第3條），不是只抓關鍵字】
逐句閱讀，像稽查人員一樣找出「消費者看完會以為這個食品有某種效果或療效」的所有表述，包含：
1. 明示或暗示疾病、症狀與療效：便秘、便祕、腹瀉、失眠、過敏、發炎、三高等疾病或症狀名稱，即使出現在團購招呼句、目標族群或見證中（例如「有便祕困擾的人一起買」＝暗示本品可改善便秘），都要標出。
2. 見證與實測式的效果宣稱、速效：「實測一條就…」「隔天就…」「上很快」「吃了就會…」「補充好菌」等以個人經驗保證效果或快速見效。
3. 口語因果與生理、外觀改變：「每天大便皮膚就會變好」「不排便臉色就暗沉」「改變腸道（腸子裡）的細菌」「變瘦、窈窕、纖體、排毒、清宿便」等涉及維持或改變人體器官、組織、生理或外觀。
4. 恐嚇或負面誘導：宿便／大便堆積「很毒」「很髒」、不吃會「灌腸」等以疾病風險或體內毒素恐嚇消費者。
5. 絕對或保證用語：「沒有副作用」「100%」「第一」「保證」等。
6. 目標族群暗示效果：「想要窈窕者」「三高族」等。
7. 一般食品宣稱健康食品保健功效（調節血脂、胃腸功能改善、護肝、抗疲勞…）或自稱健康食品。
不需標示（避免過度審查）：純粹描述口感、價格、食用方式與建議量、購買連結、個人喜好（例如好吃、有嚼勁、便宜）；食用注意事項與警語（例如與藥物間隔時間、孕婦或孩童不宜食用、喝水建議）；單純記錄自己的食用日常或食用過量的提醒（例如「我每天吃一條」「不要一天吃超過三條」），只要沒有搭配疾病字眼、效果保證（實測、就可以、保證）、速效（隔天、上很快）或生理外觀改變；產品官方品名本身不列為 span（如品名有疑慮，寫在 summary）。認定準則附件一詞句本身可用（藍線）。

【等級】
- red 紅線：涉及醫療效能（食安法第28條第2項、認定準則第5條）：預防、改善、減輕、診斷或治療疾病、疾病症候群或症狀（含便秘／便祕等症狀）；減輕或降低導致疾病有關之體內成分（如宿便毒素）；暗示醫療處置（如灌腸）；中藥材效能；或一般食品宣稱健康食品保健功效（健康食品管理法第6條）、健康食品超出核准範圍（第14條）。
- yellow 黃線：不實、誇張或易生誤解（食安法第28條第1項、認定準則第4條）：見證保證效果、速效、改變生理或外觀（皮膚、臉色、窈窕、腸道菌相）、無副作用等絕對用語、證據不足。
- blue 藍線：認定準則附件一、附件二詞句（附件二需寫明營養素主詞），或核准功效原文。

【span 標示規則（非常重要）】
- span 必須是原文「逐字複製」的連續片段，字元完全相同（含 祕/秘、全形半形、括號、空格），不可改字、不可加「…」、不可跨段落。
- span 要涵蓋完整的風險子句或句子（從前一個標點後開始，到該句結束的標點前或後），不要只標單一字詞；同一句內相關的多個風險子句合併成一個 span（例如「實測一條就可以幫助排便(…上很快…)，每天持續吃可以補充好菌」整段為一個 span）。
- 每個 span 只出現一次、彼此不重疊；長度建議 8–120 字。

【改寫 rewrite 規則（像資深編輯，不是換關鍵字）】
- rewrite 會「直接取代原文中的 span」，取代後必須與 span 前後文自然銜接、語意通順，是正常的中文句子；請先在心中把 rewrite 放回原文讀一遍。
- 保留作者原本的口吻、人稱與語氣（口語、開箱、分享風格就維持口語），保留不違規的資訊（產品名、吃法、價格、連結）。
- 不可更動產品名稱與暱稱以外的事實資訊；不要用「只要…就能」「一條就能」「保證」「一定」等效果保證句型，附件一詞句請以「有助於／幫助」等平實語氣帶出。改寫句不得出現改變細菌／菌叢／菌相、補充好菌、排毒、宿便等詞，也不得出現「為您幫助」這類疊字病句。附件一詞句要融入語法（例如「有助於養顏美容」，不可寫成「氣色也會跟著養顏美容」）；原文是個人口吻的閒聊，就維持口語、簡短，不要寫成官方說明書。
- 完全移除違規意涵，不得再出現疾病或症狀名稱、療效、速效、保證、外觀或生理改變；描述效果時優先使用附件一詞句（如使排便順暢、幫助消化、調整體質、健康維持、營養補給、促進新陳代謝、調節生理機能）。
- span 結尾有標點，rewrite 結尾也保留相同標點；span 結尾沒有標點，rewrite 也不要加。
- 若整句沒有可保留的合法內容，改寫成一句與前後文順接的中性分享句（例如「我個人覺得還不錯。」），不要留空。
- alternatives 可再提供 0–1 個不同說法。

【reason 檢核說明】仿照稽查報告：「因內容提及○○（點出具體字詞與暗示），涉及…」，40–80 字，指出屬醫療效能或不實誇張易生誤解。
【law_codes】從下列代碼選用：FSA28-1（不實誇張易生誤解）、FSA28-2（醫療效能）、STD4（認定準則第4條）、STD5（認定準則第5條）、HFA6、HFA14。紅線通常為 ["FSA28-2","STD5"]，黃線為 ["FSA28-1","STD4"]。
【blue】列出文案中出現的、可保留的附件一／附件二／核准功效短詞（每個 2–15 字、不可重複、不要整串列表）。

【附件一 通常可使用之詞句】${KB.att1.join('、')}
【附件二 營養素生理功能詞句】
${a2}
【本次產品】${ctxLine(ctx)}
${ctx.nutr&&ctx.nutr.length?'業者聲明含有營養素：'+ctx.nutr.join('、')+(ctx.nutrOK?'（含量已確認合規）':'（含量尚未確認）'):''}

只輸出 JSON：
{"extracted_text":"只有附圖片時才填入圖片中的廣告文字；沒有圖片一律為空字串，不可摘要文案","overall":"高風險|中風險|低風險","summary":"2–4 句整體評估與最優先修改事項","findings":[{"span":"","level":"red|yellow","category":"例如：療效暗示／速效見證／外觀改變／恐嚇誘導／絕對用語","reason":"","law_codes":["FSA28-1","STD4"],"rewrite":"","alternatives":[""]}],"blue":["",""]}`}
function auditUser(text,pre,nImg){return `請審核以下廣告文案${nImg?'（另附 '+nImg+' 張廣告圖片，請一併判讀並把圖片文字放入 extracted_text）':''}，找出所有紅線與黃線（不可遺漏後段重複出現的同類問題）：
<<<
${text||'（文案在圖片中）'}
>>>
離線規則預審命中（僅供參考，請以整體語意判斷並補足遺漏）：
${pre||'（無）'}`}
function polishSystem(ctx){return `你是台灣食品廣告的資深合規文案編輯。任務：把一篇已初步改寫過的廣告文案「整體修改文字邏輯與潤澤」，讓它成為通順自然、前後邏輯一致、符合法規的正常文章。
規則：
1. 保留原作者的口吻、人稱、風格與幽默感（口語分享文就維持口語），保留原本的段落順序、Q&A 結構、產品名稱、價格、優惠組合、連結網址、表情符號與換行。
2. 最小幅度修改：只改「已改寫的句子」及其前後一句的銜接，修正不通順、重複、因果斷裂或殘留違規意涵之處；其他沒有違規的句子必須逐字保留（包括個人食用日常、食用過量提醒、口語與幽默段落），不要整段重寫、不要刪除段落、不要更改產品名稱。
2-1. 不要使用「只要…就能」「一條就能」「保證」「一定」「達到…效果」等效果保證句型；不要額外堆疊附件一詞句來誇讚產品。
3. 全文不得出現：疾病或症狀名稱（含便秘、便祕、腹瀉等）、療效或預防治療、速效或見證保證效果（實測一條就、上很快、隔天就）、改變生理或外觀（皮膚變好、臉色、窈窕、瘦、改變腸道細菌、補充好菌）、體內毒素或恐嚇（很毒、很髒、灌腸、宿便）、絕對用語（沒有副作用、100%、保證、第一）、健康食品保健功效。
4. 效果描述只能使用附件一詞句：${KB.att1.join('、')}。
5. 不要新增原文沒有的產品資訊或宣稱，不要加註解或說明。
產品身分：${ctxLine(ctx)}
只輸出 JSON：{"text":"潤飾後全文","notes":"一句話說明主要修改"}`}
function polishUser(orig,draft,items){return `【原始文案】
<<<
${orig}
>>>
【已套用逐句改寫的草稿】（請以此為基礎潤飾）
<<<
${draft}
>>>
【本次需處理的風險與建議改寫】
${items.map((f,i)=>`${i+1}. [${f.tier==='red'?'紅線':'黃線'}]「${f.q}」→ 建議：「${f.rw||'請改寫為合規說法'}」（${f.why||f.cat||''}）`).join('\n')||'（無）'}`}
// ---------- 呼叫 ----------
async function callAI(s,sys,userText,images,opt={}){const p=s.provider;let url,headers={'Content-Type':'application/json'},body;
 const imgs=(s.vision?images:[])||[];const parts=u=>u.split(',');const fetchF=opt.fetch||G.fetch.bind(G);
 if(p==='anthropic'){url='https://api.anthropic.com/v1/messages';Object.assign(headers,{'x-api-key':s.key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'});
  body={model:s.model,max_tokens:16000,system:sys,messages:[{role:'user',content:[...imgs.map(u=>({type:'image',source:{type:'base64',media_type:parts(u)[0].slice(5).split(';')[0],data:parts(u)[1]}})),{type:'text',text:userText}]}]}}
 else if(p==='gemini'){url='https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(s.model)+':generateContent';headers['x-goog-api-key']=s.key;
  body={systemInstruction:{parts:[{text:sys}]},contents:[{role:'user',parts:[...imgs.map(u=>({inline_data:{mime_type:parts(u)[0].slice(5).split(';')[0],data:parts(u)[1]}})),{text:userText}]}],generationConfig:{responseMimeType:'application/json'}}}
 else{url=p==='custom'?(s.base||'').replace(/\/+$/,'')+'/chat/completions':'https://api.openai.com/v1/chat/completions';headers.Authorization='Bearer '+s.key;
  body={model:s.model,messages:[{role:'system',content:sys},{role:'user',content:imgs.length?[{type:'text',text:userText},...imgs.map(u=>({type:'image_url',image_url:{url:u}}))]:userText}]};if(p==='openai')body.response_format={type:'json_object'}}
 let lastErr;for(let attempt=0;attempt<4;attempt++){
  const r=await fetchF(url,{method:'POST',headers,body:JSON.stringify(body),referrerPolicy:'no-referrer'});const j=await r.json().catch(()=>({}));
  if(r.ok){let t;if(p==='anthropic')t=(j.content||[]).map(c=>c.text||'').join('');else if(p==='gemini')t=((j.candidates||[])[0]?.content?.parts||[]).filter(x=>!x.thought).map(x=>x.text||'').join('');else t=j.choices?.[0]?.message?.content||'';
   if(t)return t;lastErr=new Error('AI 回傳空白內容'+(p==='gemini'&&j.candidates?.[0]?.finishReason?'（'+j.candidates[0].finishReason+'）':''))}
  else{lastErr=new Error((j.error&&(j.error.message||j.error.type))||('HTTP '+r.status));if(r.status===429&&/limit: 0\b/.test(lastErr.message)){const e=new Error('此模型「'+s.model+'」不在您目前方案的免費額度內（Google 回覆 limit: 0）。請改選 gemini-3-flash-preview、gemini-3.5-flash 或 gemini-3.1-flash-lite，或到 Google AI Studio 啟用付費方案。');e.quota0=true;throw e}
   if(r.status===429&&/PerDay/i.test(JSON.stringify(j.error&&j.error.details||'')+lastErr.message)){const e=new Error('「'+s.model+'」今日免費額度已用完（Google 每日請求上限）。請到「設定」改選其他模型（例如 gemini-3.5-flash 或 gemini-3.1-flash-lite，各模型額度分開計算），或明天再試。');e.quotaDay=true;throw e}
   if(![429,500,502,503,504,529].includes(r.status))throw lastErr}
  if(opt.onRetry)opt.onRetry(attempt+1,lastErr.message);await new Promise(res=>setTimeout(res,(opt.backoff||4000)*Math.pow(2,attempt)))}
 throw lastErr}
function parseJSON(t){t=(t||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'');const a=t.indexOf('{'),b=t.lastIndexOf('}');return JSON.parse(t.slice(a,b+1))}
// ---------- 片段定位（容錯：祕/秘、全半形、空白、省略號） ----------
const NMAP={'祕':'秘','（':'(','）':')','，':',','：':':','；':';','！':'!','？':'?','「':'"','」':'"','『':'"','』':'"','　':' ','ㄧ':'一','～':'~','－':'-','％':'%'};
function norm(s){let o='',idx=[];for(let i=0;i<s.length;i++){let c=s[i];if(/\s/.test(c))continue;c=NMAP[c]||c;const cc=c.charCodeAt(0);if(cc>=0xFF01&&cc<=0xFF5E)c=String.fromCharCode(cc-0xFEE0);o+=c;idx.push(i)}return {s:o,idx}}
function locate(text,span,hint=0,used=[]){span=(span||'').trim();if(!span)return null;
 const free=(s,e)=>!used.some(u=>u[0]<e&&s<u[1]);
 const pick=(arr)=>{arr=arr.filter(x=>free(x[0],x[1]));if(!arr.length)return null;arr.sort((a,b)=>Math.abs(a[0]-hint)-Math.abs(b[0]-hint));return arr[0]};
 let all=[],i=-1;while((i=text.indexOf(span,i+1))>=0)all.push([i,i+span.length]);let r=pick(all);if(r)return r;
 const N=norm(text);const tryN=(sp)=>{const ns=norm(sp).s;if(ns.length<2)return [];let out=[],k=-1;while((k=N.s.indexOf(ns,k+1))>=0)out.push([N.idx[k],N.idx[k+ns.length-1]+1]);return out};
 r=pick(tryN(span));if(r)return r;
 const pieces=span.split(/…+|\.{3,}/).map(x=>x.trim()).filter(x=>x.length>=2);
 if(pieces.length>=2){const a=pick(tryN(pieces[0]));if(a){const rest=text.slice(a[1]);const nb=norm(pieces[pieces.length-1]).s;const NR=norm(rest);const k=NR.s.indexOf(nb);if(k>=0){const e=a[1]+NR.idx[k+nb.length-1]+1;if(free(a[0],e))return [a[0],e]}}}
 for(let L=Math.min(span.length-1,40);L>=8;L-=2){r=pick(tryN(span.slice(0,L)));if(r){const [, s0]=[0,r[0]];let e=r[1];const end=text.slice(e).search(/[。！？!?\n]/);if(end>=0&&end<80)e+=end;return [s0,e]}}
 return null}
// ---------- AI 結果正規化 ----------
function normalizeAudit(text,out){const items=[],used=[];let hint=0;const miss=[];
 for(const a of (out.findings||[])){const lv=a.level||a.tier;if(!['red','yellow'].includes(lv))continue;const sp=a.span||a.quote;const loc=locate(text,sp,hint,used);
  if(!loc){miss.push(sp);continue}used.push(loc);hint=loc[0];
  const codes=(a.law_codes&&a.law_codes.length?a.law_codes:(lv==='red'?['FSA28-2','STD5']:['FSA28-1','STD4'])).filter(c=>LAWS[c]);
  const P=/[。！？，、；：!?,.;]$/,nx=text[loc[1]]||'',fp=x=>(nx&&/^[。！？，、；：!?,.;]/.test(nx)?x.replace(/[。！？，、；：!?,.;]+$/,''):x);const rw=fp((a.rewrite||'').trim()),alts=(a.alternatives||[]).map(x=>fp((x||'').trim())).filter(x=>x&&x!==rw).slice(0,2);
  items.push({tier:lv,cat:a.category||(lv==='red'?'醫療效能':'不實誇張易生誤解'),s:loc[0],e:loc[1],q:text.slice(loc[0],loc[1]),why:(a.reason||a.explanation||'').trim(),laws:codes,basis:codes.map(c=>LAWS[c].name).join('；')+'；'+PEN[lv],lawText:lawText(codes),rw,alts,fix:[rw,...alts].filter(Boolean),rewrites:[rw,...alts].filter(Boolean),rep:rw,src:'AI',rid:'AI'})}
 const okPh=KB.att1.concat(...KB.att2.map(g=>g.phrases.map(p=>p.replace(/。/g,'').replace(/^(有助於|有助|幫助|增進|促進)/,'')))).filter(p=>p.length>=2);
 const blue=[...new Set((out.blue||[]).map(x=>(x||'').trim().replace(/[。，、]$/,'')).filter(x=>x.length>=2&&x.length<=30))].filter(b=>text.includes(b)&&okPh.some(p=>b.includes(p)))
  .filter(b=>{let i=-1;while((i=text.indexOf(b,i+1))>=0){if(!items.some(f=>f.s<i+b.length&&i<f.e))return true}return false});
 return {items:items.sort((a,b)=>a.s-b.s),blue,miss,summary:out.summary||'',overall:out.overall||'',extracted:out.extracted_text||''}}
// 依位置套用改寫（由後往前）
function applyAll(text,items){const arr=items.filter(f=>f.s>=0&&f.rw!=null&&f.rw!=='').slice().sort((a,b)=>b.s-a.s);let t=text,last=Infinity;for(const f of arr){if(f.e>last)continue;t=t.slice(0,f.s)+f.rw+t.slice(f.e);last=f.s}return t}
// 保護未被標示的段落：潤飾稿中「原文未被標示、未被改寫」的行，一律還原為原句（避免 AI 過度改寫語氣與產品暱稱）
function guardLines(orig,draft,polished,todo){const O=orig.split('\n'),D=draft.split('\n'),P=polished.split('\n');if(O.length!==D.length||P.length!==D.length)return {text:polished,restored:0};
 let pos=0,restored=0;const out=P.slice();for(let i=0;i<O.length;i++){const s=pos,e=pos+O[i].length;pos=e+1;
  const flagged=(todo||[]).some(f=>f.s!=null&&f.s>=0&&f.s<e&&f.e>s);if(!flagged&&O[i]===D[i]&&P[i]!==D[i]){out[i]=D[i];restored++}}
 return {text:out.join('\n'),restored}}
// 完整流程：審核
async function audit(s,ctx,text,pre,images,opt){const raw=await callAI(s,auditSystem(ctx),auditUser(text,pre,(images||[]).length),images,opt);const out=parseJSON(raw);const r=normalizeAudit(text,out);r.raw=out;return r}
// 完整流程：全部套用 → 潤飾 → 複審（最多 maxLoop 輪修正）
async function polishLoop(s,ctx,orig,items,ruleItems,opt={}){const log=opt.log||(()=>{});const maxLoop=opt.maxLoop??2;
 let todo=items.concat(ruleItems||[]);let draft=applyAll(orig,items);let rounds=[];let text=draft,res=null;
 for(let round=0;round<=maxLoop;round++){log('潤飾第 '+(round+1)+' 輪…');
  const out=parseJSON(await callAI(s,polishSystem(ctx),polishUser(orig,draft,todo),[],opt));text=(out.text||draft).trim();{const g=guardLines(orig.trim(),draft.trim(),text,todo);text=g.text;if(g.restored)log('保留未標示段落 '+g.restored+' 行');}
  log('複審第 '+(round+1)+' 輪…');const pre=opt.preScan?opt.preScan(text):'';res=await audit(s,ctx,text,pre,[],opt);
  const extra=opt.ruleScan?opt.ruleScan(text).filter(r=>!res.items.some(a=>a.s<r.e&&r.s<a.e)):[];
  const bad=res.items.concat(extra);rounds.push({text,notes:out.notes||'',red:bad.filter(x=>x.tier==='red').length,yellow:bad.filter(x=>x.tier==='yellow').length});
  if(!bad.some(x=>x.tier==='red')&&bad.filter(x=>x.tier==='yellow').length===0)break;
  if(round===maxLoop)break;draft=applyAll(text,res.items);todo=bad;orig=text}
 return {text,audit:res,rounds}}
G.ADCAI={LAWS,PEN,lawText,auditSystem,auditUser,polishSystem,polishUser,callAI,parseJSON,locate,norm,normalizeAudit,applyAll,guardLines,audit,polishLoop};
})(typeof window!=='undefined'?window:globalThis);
