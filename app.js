'use strict';
// ================= 加密 =================
const ITER=600000, enc=new TextEncoder(), dec=new TextDecoder(), LS='adc_blob_v1';
const b64=a=>{const u=new Uint8Array(a);let s='';for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s)};
const ub64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function dkey(pw,salt){const k=await crypto.subtle.importKey('raw',enc.encode(pw),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITER,hash:'SHA-256'},k,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function encryptObj(pw,obj){const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},await dkey(pw,salt),enc.encode(JSON.stringify(obj)));
 return JSON.stringify({app:'ad-compliance',v:1,alg:'AES-256-GCM',kdf:'PBKDF2-SHA256',iter:ITER,salt:b64(salt),iv:b64(iv),ct:b64(ct),saved:new Date().toISOString()})}
async function decryptObj(pw,s){const o=JSON.parse(s);const k=await dkey(pw,ub64(o.salt));
 return JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:ub64(o.iv)},k,ub64(o.ct))))}

// ================= 狀態 =================
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,10);
const TIER={red:'紅線',yellow:'黃線',blue:'藍線'}, TIERDESC={red:'高風險違規',yellow:'中風險／易生誤解',blue:'安全可用'};
let PW=null, V=null, tab='scan', IMGS=[], LAST=null, CTX={mode:'general',lic:null,nutr:[],nutrOK:false,title:''}, idleT=null;
const defV=()=>({settings:{provider:'openai',model:'gpt-4.1',key:'',base:'',vision:true,autoOcr:true},history:[],draft:''});
function toast(m,ms=2600){const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(t._t);t._t=setTimeout(()=>t.style.display='none',ms)}
async function save(){if(!PW){status('試用模式：未儲存');return}
 localStorage.setItem(LS,await encryptObj(PW,V));status('已加密儲存 '+new Date().toLocaleTimeString('zh-TW',{hour12:false}))}
function status(m){$('#status').textContent=m}

// ================= 登入 =================
function loginView(){const has=localStorage.getItem(LS);
 $('#appv').style.display='none';$('#login').style.display='block';
 $('#login').innerHTML=has?`<h2>食品廣告法規審核</h2><p>請輸入密碼，解鎖這台裝置上的加密資料（AI 金鑰、審核紀錄）。</p>
 <input id=pw type=password placeholder="密碼" autocomplete="current-password"><div class=row><button class=btn id=bLogin>解鎖</button><span id=lm class=small></span></div>
 <p class=small>資料以 AES-256-GCM 加密（PBKDF2-SHA256 ${ITER.toLocaleString()} 次），只存在這個瀏覽器。忘記密碼無法復原。</p>
 <p class=small><a href="#" id=bReset>清除這台裝置的加密資料並重新開始</a>　｜　<a href="#" id=bImp0>從加密備份檔還原</a></p>`
 :`<h2>食品廣告法規審核</h2><p>依《食品安全衛生管理法》、《健康食品管理法》、認定準則與食藥署 115 年 5 月《食品廣告合規輔導指引》，將廣告文案分為<span class="tier t-red">紅線</span> <span class="tier t-yellow">黃線</span> <span class="tier t-blue">藍線</span>並提供修改建議。</p>
 <div class=card style="background:#f6fafc"><b>A. 先試用</b><p class=small>不需密碼，立即可用離線規則預審；也可先填 AI 金鑰測試。試用期間資料只在記憶體，關閉分頁即消失，確認好用再設密碼加密保存。</p><button class=btn id=bTrial>先試用</button></div>
 <div class=card style="background:#f6fafc"><b>B. 直接設定密碼</b><p class=small>至少 10 碼。之後 AI 金鑰與審核紀錄都會加密存放在這台裝置。</p>
 <input id=pw type=password placeholder="設定密碼（至少 10 碼）" autocomplete="new-password"><input id=pw2 type=password placeholder="再輸入一次" autocomplete="new-password">
 <div class=row><button class=btn2 id=bInit>建立加密保險箱</button><span id=lm class=small></span></div></div>
 <p class=small><a href="#" id=bImp0>從加密備份檔還原</a></p>`;
 const on=(id,f)=>{const e=$('#'+id);if(e)e.onclick=e2=>{e2.preventDefault();f()}};
 on('bLogin',doLogin);on('bTrial',()=>{PW=null;V=defV();enter()});on('bInit',doInit);on('bImp0',importBackup);
 on('bReset',()=>{if(confirm('確定清除這台裝置的加密資料？此動作無法復原（若有備份檔可再還原）。')){localStorage.removeItem(LS);loginView()}});
 const pw=$('#pw');if(pw)pw.onkeydown=e=>{if(e.key==='Enter')(has?doLogin:doInit)()};setTimeout(()=>pw&&pw.focus(),50);
}
async function doLogin(){const pw=$('#pw').value;$('#lm').textContent='解密中…';
 try{V=await decryptObj(pw,localStorage.getItem(LS));PW=pw;V=Object.assign(defV(),V);V.settings=Object.assign(defV().settings,V.settings);enter()}catch(e){$('#lm').innerHTML='<span class=bad>密碼錯誤或資料損毀</span>'}}
async function doInit(){const a=$('#pw').value,b=$('#pw2').value;if(a.length<10)return $('#lm').innerHTML='<span class=bad>密碼至少 10 碼</span>';if(a!==b)return $('#lm').innerHTML='<span class=bad>兩次輸入不一致</span>';
 $('#lm').textContent='加密中…';PW=a;V=V||defV();await save();enter();toast('已建立加密保險箱')}
function enter(){const st=V.settings;if(st.provider==='gemini'&&/^gemini-(2\.5-pro|1\.|2\.0)/.test(st.model||''))st.model='gemini-3-flash-preview';
 $('#login').style.display='none';$('#appv').style.display='block';
 if(V.draft&&!$('#src'))CTX._draft=V.draft;trialBar();setTab(tab);resetIdle()}
function trialBar(){const b=$('#trialBar');$('#modeTag').textContent=PW?'機密・加密儲存':'試用模式';
 if(PW){b.style.display='none';return}b.style.display='block';
 b.innerHTML='試用模式：資料（含 AI 金鑰、審核紀錄）只在記憶體，關閉分頁就會消失。<button class="btn2" id=bSetPw style="margin-left:8px">設定密碼並加密保存</button>';$('#bSetPw').onclick=setPwDlg}
function lock(){PW=null;V=null;LAST=null;IMGS=[];CTX={mode:'general',lic:null,nutr:[],nutrOK:false,title:''};$('#main').innerHTML='';loginView()}
function resetIdle(){clearTimeout(idleT);if(PW)idleT=setTimeout(()=>{toast('閒置 30 分鐘，已自動鎖定');lock()},30*60*1000)}
['click','keydown'].forEach(ev=>document.addEventListener(ev,()=>{if(PW)resetIdle()}));
function setPwDlg(){const d=$('#dlg');d.innerHTML=`<h3>${PW?'變更密碼':'設定密碼並加密保存'}</h3>${PW?'<label>目前密碼</label><input id=op type=password>':''}
 <label>新密碼（至少 10 碼）</label><input id=np type=password autocomplete="new-password"><label>再輸入一次</label><input id=np2 type=password autocomplete="new-password">
 <p class=small>密碼不會上傳到任何地方，忘記無法復原，請另行妥善保存。</p><div class=row><button class=btn id=ok>確定</button><button class=btn2 id=cc>取消</button><span id=dm></span></div>`;d.showModal();
 $('#cc').onclick=()=>d.close();$('#ok').onclick=async()=>{const a=$('#np').value,b=$('#np2').value;
  if(PW&&$('#op').value!==PW)return $('#dm').innerHTML='<span class=bad>目前密碼錯誤</span>';if(a.length<10)return $('#dm').innerHTML='<span class=bad>至少 10 碼</span>';if(a!==b)return $('#dm').innerHTML='<span class=bad>不一致</span>';
  $('#dm').textContent='加密中…';PW=a;await save();d.close();trialBar();toast('已加密保存');if(tab==='set')setTab('set')}}
async function exportBackup(){if(!PW)return toast('請先設定密碼');await save();const blob=new Blob([localStorage.getItem(LS)],{type:'application/json'});
 dl(blob,'廣告審核_加密備份_'+new Date().toISOString().slice(0,10)+'.json')}
function importBackup(){const i=document.createElement('input');i.type='file';i.accept='.json,application/json';i.onchange=async()=>{const s=await i.files[0].text();
 let o;try{o=JSON.parse(s)}catch(e){return alert('不是有效的備份檔')}if(o.app!=='ad-compliance'||!o.ct)return alert('不是本工具的加密備份檔');
 const pw=prompt('請輸入此備份檔的密碼');if(!pw)return;try{const v=await decryptObj(pw,s);if(localStorage.getItem(LS)&&!confirm('將以備份覆蓋這台裝置目前的加密資料，確定？'))return;
  localStorage.setItem(LS,s);PW=pw;V=Object.assign(defV(),v);V.settings=Object.assign(defV().settings,V.settings);enter();toast('已還原備份')}catch(e){alert('密碼錯誤，無法解密')}};i.click()}
function dl(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}

// ================= 導覽 =================
function setTab(t){tab=t;$$('nav button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));const m=$('#main');
 if(t==='scan'){m.innerHTML=scanView();bindScan()}else if(t==='hist'){m.innerHTML=histView();bindHist()}else if(t==='kb'){m.innerHTML=kbView();bindKb()}else{m.innerHTML=setView();bindSet()}}
document.addEventListener('DOMContentLoaded',()=>{$$('nav button').forEach(b=>b.onclick=()=>{if(tab==='scan')keepDraft();setTab(b.dataset.t)});$('#lockBtn').onclick=()=>{if(!PW&&!confirm('試用模式鎖定後資料會消失，確定？'))return;lock()};loginView()});
function keepDraft(){const s=$('#src');if(s&&V)V.draft=s.value}

// ================= 檔案處理 =================
let pdfjs=null;
async function getPdf(){if(!pdfjs){pdfjs=await import('./vendor/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.mjs'}return pdfjs}
async function handleFiles(files){for(const f of files){const n=f.name.toLowerCase();
 try{if(n.endsWith('.pdf'))await doPdf(f);else if(n.endsWith('.docx'))await doDocx(f);else if(/\.(jpe?g|png|webp)$/.test(n)||f.type.startsWith('image/'))await doImg(f);
  else if(/\.(txt|md|csv)$/.test(n))appendText(f.name,await f.text());else toast('不支援的格式：'+f.name)}catch(e){console.warn(e);toast('讀取失敗：'+f.name+'（'+e.message+'）',5000)}}
 renderThumbs()}
function appendText(label,t){const s=$('#src');t=fixCJK(t).trim();if(!t)return;s.value=(s.value.trim()?s.value.trim()+'\n\n':'')+'〔'+label+'〕\n'+t;s.dispatchEvent(new Event('input'))}
async function doDocx(f){const r=await mammoth.convertToHtml({arrayBuffer:await f.arrayBuffer()});const d=document.createElement('div');d.innerHTML=r.value;
 const out=[];d.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,tr').forEach(el=>{if(el.tagName==='TR'){out.push([...el.children].map(c=>c.textContent.trim()).join('｜'))}else if(!el.closest('tr'))out.push(el.textContent.trim())});
 appendText(f.name,out.filter(Boolean).join('\n'));toast('已讀取 Word：'+f.name)}
async function doPdf(f){const lib=await getPdf();const doc=await lib.getDocument({data:new Uint8Array(await f.arrayBuffer()),cMapUrl:'vendor/cmaps/',cMapPacked:true}).promise;
 let txt=[],scanned=0;for(let p=1;p<=doc.numPages;p++){const pg=await doc.getPage(p);const tc=await pg.getTextContent();
  let line='',out=[],lastY=null;for(const it of tc.items){const y=it.transform[5];if(lastY!==null&&Math.abs(y-lastY)>3){out.push(line);line=''}line+=it.str;lastY=y;if(it.hasEOL){out.push(line);line='';lastY=null}}out.push(line);
  const t=fixCJK(out.map(s=>s.trim()).filter(Boolean).join('\n'));
  if(t.replace(/\s/g,'').length<20){scanned++;const vp=pg.getViewport({scale:2});const c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;
   await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;IMGS.push({id:uid(),name:f.name+' 第'+p+'頁（掃描）',url:shrink(c),ocr:null})}
  else txt.push('〔'+f.name+' 第'+p+'頁〕\n'+t)}
 const s=$('#src');if(txt.length){s.value=(s.value.trim()?s.value.trim()+'\n\n':'')+txt.join('\n\n');s.dispatchEvent(new Event('input'))}
 toast('已讀取 PDF：'+doc.numPages+' 頁'+(scanned?'，其中 '+scanned+' 頁為掃描影像，已轉為圖片待 OCR／AI 辨識':''),4000);if(scanned)autoOcr()}
function shrink(c,max=1600){let w=c.width,h=c.height,k=Math.min(1,max/Math.max(w,h));if(k<1){const d=document.createElement('canvas');d.width=Math.round(w*k);d.height=Math.round(h*k);d.getContext('2d').drawImage(c,0,0,d.width,d.height);c=d}return c.toDataURL('image/jpeg',0.88)}
async function doImg(f){const url=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f)});
 const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('無法解碼圖片'));i.src=url});
 const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);
 IMGS.push({id:uid(),name:f.name,url:shrink(c),ocr:null});toast('已加入圖片：'+f.name);autoOcr()}
function hasAI(){return !!(V.settings.key&&V.settings.model)}
function autoOcr(){if(!hasAI()&&V.settings.autoOcr)setTimeout(()=>ocrAll(),50)}
let tessW=null;
async function ocrAll(){const todo=IMGS.filter(i=>i.ocr===null);if(!todo.length)return toast('沒有待辨識的圖片');
 const pb=$('#ocrProg');pb.style.display='block';const bar=pb.querySelector('div'),lab=$('#ocrLab');
 try{if(!window.Tesseract){await new Promise((res,rej)=>{const s=document.createElement('script');s.src='vendor/tesseract.min.js';s.onload=res;s.onerror=()=>rej(new Error('載入 OCR 失敗'));document.head.appendChild(s)})}
  if(!tessW){lab.textContent='下載繁體中文 OCR 語言檔（首次約 10–20 MB）…';tessW=await Tesseract.createWorker(['chi_tra','eng'],1,{workerPath:'vendor/worker.min.js',logger:m=>{if(m.progress!=null){bar.style.width=Math.round(m.progress*100)+'%';lab.textContent=(m.status||'')+' '+Math.round(m.progress*100)+'%'}}})}
  for(const im of todo){im.ocr='';lab.textContent='辨識中：'+im.name;const r=await tessW.recognize(im.url);const t=fixCJK(r.data.text).replace(/(?<=[\u4e00-\u9fff，。、！？‧・])[ \t]+|[ \t]+(?=[\u4e00-\u9fff，。、！？‧・])/g,'');im.ocr=t;appendText(im.name+'（本機 OCR）',t)}
  lab.textContent='OCR 完成，請檢查並修正辨識文字後再審核';bar.style.width='100%';renderThumbs()}
 catch(e){console.warn(e);lab.textContent='OCR 失敗：'+e.message;todo.forEach(i=>{if(i.ocr==='')i.ocr=null})}}
function renderThumbs(){const t=$('#thumbs');if(!t)return;t.innerHTML=IMGS.map(i=>`<div class=thumb><img src="${i.url}" alt=""><div>${esc(i.name)}</div><div class=small>${i.ocr===null?'待辨識':'已 OCR'}</div><button data-x="${i.id}" title="移除">✕</button></div>`).join('');
 t.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>{IMGS=IMGS.filter(i=>i.id!==b.dataset.x);renderThumbs()});$('#imgTools').style.display=IMGS.length?'flex':'none'}

// ================= 審核畫面 =================
function scanView(){const s=V.settings;const lic=CTX.lic;
 return `<div class=grid2><div>
 <div class=card><h3>1. 產品身分</h3>
  <div class=row><label><input type=radio name=mode value=general ${CTX.mode==='general'?'checked':''}> 一般食品</label><label><input type=radio name=mode value=health ${CTX.mode==='health'?'checked':''}> 健康食品（小綠人）</label></div>
  <div id=licBox style="display:${CTX.mode==='health'?'block':'none'}"><div class=row><input id=licQ placeholder="輸入許可證字號或品名搜尋（例：A00235、魚油）" style="flex:1"><button class=btn2 id=licGo>搜尋</button></div><div id=licRes class=small></div>
   <div id=licSel>${lic?licCard(lic):'<span class=small>尚未選擇許可證</span>'}</div></div>
  <details ${CTX.nutr.length?'open':''}><summary>營養素（附件二生理功能詞句檢查，選填）</summary><div class=row style="font-size:13px">${KB.att2.map(g=>`<label><input type=checkbox class=nu value="${esc(g.nutrient)}" ${CTX.nutr.includes(g.nutrient)?'checked':''}>${esc(g.nutrient)}</label>`).join(' ')}</div>
  <label class=small><input type=checkbox id=nutrOK ${CTX.nutrOK?'checked':''}> 已確認上述營養素含量符合「包裝食品營養宣稱應遵行事項」等規定（附件二註一）</label></details></div>
 <div class=card><h3>2. 文案內容</h3><div class=row><input id=title placeholder="案件名稱（例：魚油 FB 貼文 v2）" value="${esc(CTX.title)}" style="flex:1"></div>
  <textarea id=src placeholder="貼上廣告文案，或拖曳 PDF／Word／圖片到下方…">${esc(CTX._draft||'')}</textarea>
  <div class=drop id=drop>拖曳或點此上傳：PDF（.pdf）・Word（.docx）・圖片（.jpg .png .webp）・純文字（.txt）<input type=file id=file multiple accept=".pdf,.docx,.jpg,.jpeg,.png,.webp,.txt,.md" style="display:none"></div>
  <div class=thumbs id=thumbs></div>
  <div class=row id=imgTools style="display:none"><button class=btn2 id=bOcr>本機 OCR 辨識圖片文字（Tesseract）</button><span class=small>${hasAI()&&s.vision?'已設定 AI：深度審核時會直接把圖片交給 Vision 模型判讀':'未設定 AI 金鑰：使用本機 OCR'}</span></div>
  <div id=ocrProg style="display:none"><div class=prog><div></div></div><div class=small id=ocrLab></div></div>
  <div class=row style="margin-top:10px"><button class=btn id=bScan>離線規則預審</button><button class=btn id=bAI ${hasAI()?'':'disabled title="請先在「AI 與安全設定」填入金鑰"'} style="background:#6a1b9a">AI 深度審核${hasAI()?'（'+esc(providerName(s.provider))+'）':''}</button><button class=btn2 id=bClear>清空</button>
  <span class=small>${hasAI()?'':'尚未設定 AI 金鑰，可先用離線預審'}</span></div>
  <p class=small>輸入文字會即時做離線規則預審。資料只在您的瀏覽器處理；AI 深度審核時才會把文案（與圖片）送到您設定的 AI 服務。</p></div>
 <div class="card legend"><h3>三級分類說明</h3>
  <div><span class="tier t-red">紅線</span> 高風險違規：涉及醫療效能（食安法 §28-2、認定準則 §5，罰 60萬–500萬元）、一般食品宣稱健康食品保健功效（健康食品管理法 §6）、健康食品超出核准範圍（同法 §14）。</div>
  <div><span class="tier t-yellow">黃線</span> 中風險／易生誤解：不實、誇張或易生誤解（食安法 §28-1、認定準則 §4，罰 4萬–400萬元），如絕對性用語、改變生理或外觀、研究或見證引用、營養素詞句未寫主詞或含量未確認。</div>
  <div><span class="tier t-blue">藍線</span> 安全可用：認定準則附件一通常可使用詞句、附件二營養素生理功能詞句（含量合規並寫明主詞）、小綠人核准功效原文。</div>
  <div class=small>依據：${esc(KB.guide.title)}；規則僅為例示比對，最終仍依整體表現綜合判斷（認定準則 §3）。</div></div>
 </div><div id=result>${LAST?resultHtml(LAST):'<div class=card><h3>審核結果</h3><p class=muted>輸入或上傳文案後，這裡會顯示紅線／黃線／藍線標示與修改建議。</p></div>'}</div></div>`}
function licCard(l){return `<div class=card style="background:#f1f8e9;margin:6px 0;padding:8px 12px"><b>${esc(l[2])}</b> <span class=pill>${esc(l[0])}</span> <span class="pill ${l[5]==='核可'?'ok':'bad'}">${esc(l[5])}</span><br>
 <span class=small>申請商：${esc(l[4])}｜核可：${esc(l[3])}｜功效成分：${esc(l[6])}</span><br><b>核准功效：</b>${esc(l[7])}<div class=small style="white-space:pre-wrap"><b>宣稱：</b>${esc(l[8])}</div>
 <details><summary class=small>警語與注意事項</summary><div class=small style="white-space:pre-wrap">${esc(l[9])}\n${esc(l[10])}</div></details><button class=btn3 id=licClr>取消選擇</button></div>`}
function providerName(p){return {openai:'OpenAI',anthropic:'Anthropic Claude',gemini:'Google Gemini',custom:'OpenAI 相容端點'}[p]||p}
function readCtx(){CTX.mode=($('input[name=mode]:checked')||{}).value||'general';CTX.nutr=$$('.nu').filter(x=>x.checked).map(x=>x.value);CTX.nutrOK=$('#nutrOK').checked;CTX.title=$('#title').value}
let liveT=null;
function bindScan(){const src=$('#src');renderThumbs();
 $$('input[name=mode]').forEach(r=>r.onchange=()=>{readCtx();$('#licBox').style.display=CTX.mode==='health'?'block':'none';runScan(true)});
 $$('.nu').forEach(x=>x.onchange=()=>{readCtx();runScan(true)});$('#nutrOK').onchange=()=>{readCtx();runScan(true)};
 $('#licGo').onclick=licSearch;$('#licQ').onkeydown=e=>{if(e.key==='Enter')licSearch()};bindLicClr();
 src.oninput=()=>{clearTimeout(liveT);liveT=setTimeout(()=>runScan(true),400)};
 const drop=$('#drop'),fi=$('#file');drop.onclick=()=>fi.click();fi.onchange=()=>{handleFiles([...fi.files]);fi.value=''};
 drop.ondragover=e=>{e.preventDefault();drop.classList.add('over')};drop.ondragleave=()=>drop.classList.remove('over');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('over');handleFiles([...e.dataTransfer.files])};
 src.addEventListener('paste',e=>{const it=[...(e.clipboardData||{}).items||[]].filter(i=>i.type.startsWith('image/'));if(it.length){e.preventDefault();handleFiles(it.map(i=>{const f=i.getAsFile();return new File([f],'貼上圖片.png',{type:f.type})}))}});
 $('#bOcr').onclick=ocrAll;$('#bScan').onclick=()=>{runScan(false);saveHist()};$('#bAI').onclick=runAI;
 $('#bClear').onclick=()=>{if(!confirm('清空目前文案與圖片？'))return;src.value='';IMGS=[];LAST=null;CTX._draft='';renderThumbs();$('#result').innerHTML='<div class=card><h3>審核結果</h3><p class=muted>已清空。</p></div>'};
 if(LAST)bindResult()}
function bindLicClr(){const b=$('#licClr');if(b)b.onclick=()=>{CTX.lic=null;$('#licSel').innerHTML='<span class=small>尚未選擇許可證</span>';runScan(true)}}
function licSearch(){const q=$('#licQ').value.trim();if(!q)return;const ql=q.toLowerCase();
 const r=HF.filter(h=>h[0].toLowerCase().includes(ql)||h[2].toLowerCase().includes(ql)||h[4].includes(q)||h[6].includes(q)).slice(0,30);
 $('#licRes').innerHTML=r.length?r.map((h,i)=>`<div><a href="#" data-i="${HF.indexOf(h)}">${esc(h[0])}｜${esc(h[2])}</a> <span class="${h[5]==='核可'?'ok':'bad'}">${esc(h[5])}</span>｜${esc(h[7])}</div>`).join(''):'找不到符合的許可證（資料集共 '+HF.length+' 筆）';
 $('#licRes').querySelectorAll('a').forEach(a=>a.onclick=e=>{e.preventDefault();selectLic(HF[+a.dataset.i])})}
function selectLic(h){CTX.lic=h;CTX.mode='health';const r=$('input[name=mode][value=health]');if(r){r.checked=true;$('#licBox').style.display='block';$('#licSel').innerHTML=licCard(h);$('#licRes').innerHTML='';bindLicClr();runScan(true)}}
function autoTitle(t){return (t||'').replace(/〔[^〕]*〕/g,'').trim().slice(0,18)||'未命名文案'}
function riskOf(c){return c.red?'高風險':c.yellow?'中風險':'低風險'}
function sentOf(f){const [a,b]=sentAt(LAST.text,f.s,f.e);return LAST.text.slice(a,b).trim().slice(0,120)}
async function copy(t){try{await navigator.clipboard.writeText(t);toast('已複製')}catch(e){const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove();toast('已複製')}}
// ================= AI =================
// ================= 報告匯出 =================
function reportDlg(){const o=reportObj(LAST),d=$('#dlg'),fn=(o.title||'報告').replace(/[\\/:*?"<>|]/g,'_');
 d.innerHTML=`<h3>匯出審核報告</h3><p class=small>報告會下載到您的電腦（明文），請自行妥善保管。</p><div class=row><button class=btn data-pdf=1 style="background:#c62828">匯出 PDF 報告</button><button class=btn2 data-x=md>Markdown（.md）</button><button class=btn2 data-x=doc>Word（.doc）</button><button class=btn2 data-x=html>網頁（.html）</button><button class=btn2 data-x=csv>Excel／CSV（.csv）</button><button class=btn2 data-x=json>JSON</button><button class=btn2 data-x=copy>複製 Markdown</button></div><div class=row><button class=btn id=cc>關閉</button></div>`;d.showModal();$('#cc').onclick=()=>d.close();d.querySelector('[data-pdf]').onclick=exportPdf;
 d.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>{const x=b.dataset.x;if(x==='md')dl(new Blob([toMd(o)],{type:'text/markdown'}),fn+'.md');else if(x==='doc')dl(new Blob(['\ufeff'+toHtml(o)],{type:'application/msword'}),fn+'.doc');
  else if(x==='html')dl(new Blob([toHtml(o)],{type:'text/html'}),fn+'.html');else if(x==='csv')dl(new Blob([toCsv(o)],{type:'text/csv'}),fn+'.csv');else if(x==='json')dl(new Blob([JSON.stringify(o,null,2)],{type:'application/json'}),fn+'.json');else copy(toMd(o))})}

// ================= 審核紀錄 =================
function histView(){const H=V.history;return `<div class=card><h3>審核紀錄 <span class=small>${PW?'加密儲存於這台裝置':'試用模式：不會保存'}｜共 ${H.length} 筆</span></h3>
 <div class=row><input id=hq placeholder="搜尋案件名稱或內容" style="flex:1"></div>
 <div class=scroll><table><thead><tr><th>時間</th><th>案件</th><th>身分</th><th>紅</th><th>黃</th><th>藍</th><th>AI</th><th></th></tr></thead><tbody id=hb>${histRows(H)}</tbody></table></div></div>`}
function histRows(H){return H.map(h=>`<tr><td>${new Date(h.ts).toLocaleString('zh-TW',{hour12:false})}</td><td>${esc(h.title)}</td><td>${h.mode==='health'?'健康食品':'一般食品'}</td><td class=bad>${h.counts.red}</td><td style="color:#b26a00">${h.counts.yellow}</td><td style="color:#1e88e5">${h.counts.blue}</td><td>${h.ai?'✓':''}</td><td><button class=btn3 data-o="${h.id}">開啟</button><button class=btn3 data-d="${h.id}">刪除</button></td></tr>`).join('')||'<tr><td colspan=8 class=muted>尚無紀錄</td></tr>'}
function bindHist(){const bind=()=>{$$('[data-o]').forEach(b=>b.onclick=()=>{const h=V.history.find(x=>x.id===b.dataset.o);LAST=JSON.parse(JSON.stringify(h));CTX._draft=h.text;CTX.title=h.title;CTX.mode=h.mode;CTX.lic=h.lic?HF.find(x=>x[0]===h.lic)||null:null;setTab('scan')});
 $$('[data-d]').forEach(b=>b.onclick=async()=>{if(!confirm('刪除此紀錄？'))return;V.history=V.history.filter(x=>x.id!==b.dataset.d);await save();setTab('hist')})};bind();
 $('#hq').oninput=e=>{const q=e.target.value;$('#hb').innerHTML=histRows(V.history.filter(h=>(h.title+h.text).includes(q)));bind()}}

// ================= 法規資料庫 =================
let kbSub='law';
function kbView(){return `<div class=card><div class=tabs2>${[['law','法規條文'],['a1','附件一（27 句）'],['a2','附件二 營養素詞句'],['guide','輔導指引重點'],['hf','健康食品資料集'],['viol','違規廣告資料集'],['rules','離線規則詞庫']].map(([k,n])=>`<button data-k="${k}" class="${kbSub===k?'on':''}">${n}</button>`).join('')}</div><div id=kbb></div>
 <p class=small>資料來源：全國法規資料庫、衛福部食藥署、政府資料開放平臺；資料建置時間 ${esc(KB.built)}（台灣時間）。</p></div>`}
function bindKb(){$$('.tabs2 button').forEach(b=>b.onclick=()=>{kbSub=b.dataset.k;setTab('kb')});const k=$('#kbb');
 if(kbSub==='law')k.innerHTML=KB.laws.map(l=>`<h3>${esc(l.name)} <span class=small>（${esc(l.date)}修正）<a href="${l.url}" target=_blank rel=noopener>全國法規資料庫</a></span></h3>${l.articles.map(a=>`<p><b>${esc(a.no)}</b>　${esc(a.text)}</p>`).join('')}`).join('');
 else if(kbSub==='a1')k.innerHTML=`<p>認定準則第 4 條第 3 項：得使用下列詞句，不認定為涉及不實、誇張或易生誤解。</p><ol>${KB.att1.map(p=>`<li>${esc(p)}</li>`).join('')}</ol>`;
 else if(kbSub==='a2')k.innerHTML=`<table><tr><th>營養素或特定成分</th><th>得敘述之生理功能詞句</th></tr>${KB.att2.map(g=>`<tr><td>${esc(g.nutrient)}</td><td>${g.phrases.map(esc).join('<br>')}</td></tr>`).join('')}</table><p class=small>${KB.att2_notes.map(esc).join('<br>')}</p>`;
 else if(kbSub==='guide')k.innerHTML=`<p><b>${esc(KB.guide.title)}</b>　${esc(KB.guide.org)}　<a href="${KB.guide.url}" target=_blank rel=noopener>公告頁</a>｜<a href="${KB.guide.pdf}" target=_blank rel=noopener>PDF</a></p>
 <ul><li><b>伍-三 不得涉及醫療效能</b>：直接、暗示或隱喻使消費者將食品與疾病連結（預防、改善、減輕、診斷或治療疾病；降低致病體內成分；中藥材效能）。以錯別字、諧音或搭配研究、專利、見證者，均有違規之虞。「三高」「血濁」「肝火」「管路」「壞東西」「數字紅變黑」等通俗用語屬高風險。</li>
 <li><b>伍-四 不得涉及不實、誇張或易生誤解</b>：抗老美容美體、減肥塑身、免疫、眼睛、神經、泌尿、生殖等改變生理或外觀之宣稱；引用機關公文書字號；絕對性用語（唯一、100%有效、第一、首創、最高）與快速見效（速效、立即見效、○天有效）。</li>
 <li><b>伍-五／陸 健康食品</b>：一般食品不得宣稱 14 項保健功效；健康食品不得超出核准範圍或不當延伸（如調節血脂 → 清除血栓、降低膽固醇）。</li>
 <li><b>伍-六 附件二詞句</b>：應完整敘述、寫明營養素主詞，不得以片段作品名或暗示為產品或複方功效；含量須符合營養標示規定。</li>
 <li><b>伍-七 科學資料、專利、認證</b>：個別成分研究不代表產品功效；體外／動物試驗不得暗示為人體結果；專利內容涉違規仍屬違規；健康食品不應稱「國家認證」。</li>
 <li><b>伍-八 見證</b>：使用者分享、留言屬廣告一部分；醫師、營養師見證亦不得涉違規。</li><li><b>伍-九 比較廣告</b>：以公正客觀標準完整列示並備佐證。</li>
 <li><b>柒 特殊營養與兒童食品</b>：嬰兒與較大嬰兒配方食品原則不得廣告促銷；不適合兒童長期食用食品不得於 17–21 時兒童頻道刊播等。</li></ul>`;
 else if(kbSub==='hf'){k.innerHTML=`<div class=row><input id=hq2 placeholder="搜尋許可證字號、品名、申請商、成分或功效" style="flex:1"><label class=small><input type=checkbox id=hOnly checked> 只顯示核可</label></div><p class=small>${esc(KB.sources.hf.name)}，共 ${HF.length} 筆（<a href="${KB.sources.hf.url}" target=_blank rel=noopener>data.gov.tw</a>）。點「用於審核」即可比對核准功效。</p><div class=scroll><table><thead><tr><th>許可證字號</th><th>品名</th><th>證況</th><th>保健功效</th><th>申請商</th><th></th></tr></thead><tbody id=hfb></tbody></table></div>`;
  const draw=()=>{const q=$('#hq2').value.trim(),only=$('#hOnly').checked;const r=HF.filter(h=>(!only||h[5]==='核可')&&(!q||h.slice(0,8).join('|').includes(q))).slice(0,200);
   $('#hfb').innerHTML=r.map(h=>`<tr><td>${esc(h[0])}</td><td>${esc(h[2])}</td><td class="${h[5]==='核可'?'ok':'bad'}">${esc(h[5])}</td><td>${esc(h[7])}</td><td>${esc(h[4])}</td><td><button class=btn3 data-u="${HF.indexOf(h)}">用於審核</button></td></tr>`).join('');
   $$('[data-u]').forEach(b=>b.onclick=()=>{CTX.lic=HF[+b.dataset.u];CTX.mode='health';setTab('scan');toast('已選擇許可證：'+CTX.lic[0])})};$('#hq2').oninput=draw;$('#hOnly').onchange=draw;draw()}
 else if(kbSub==='viol'){k.innerHTML='<p class=muted>載入中…</p>';loadCases().then(drawViol)}
 else if(kbSub==='rules')k.innerHTML=`<p class=small>離線預審詞庫（${RULES.R.length} 組規則＋附件一 ${KB.att1.length} 句＋附件二 ${KB.att2.reduce((a,g)=>a+g.phrases.length,0)} 句＋健康食品 14 項功效比對），依認定準則與輔導指引例示整理；例示非負面表列。</p><table><tr><th>代碼</th><th>等級</th><th>類別</th><th>比對樣式</th><th>依據</th></tr>${RULES.R.map(r=>`<tr><td>${r.id}</td><td><span class="tier t-${r.tier}">${TIER[r.tier]}</span>${r.mode?'<br><small>'+(r.mode==='general'?'限一般食品':'限健康食品')+'</small>':''}</td><td>${esc(r.cat)}</td><td style="font-size:11px;word-break:break-all">${esc(r.re.slice(0,260))}${r.re.length>260?'…':''}</td><td style="font-size:12px">${esc(r.basis)}</td></tr>`).join('')}</table>`}
function loadCases(){return window.CASES?Promise.resolve():new Promise((res,rej)=>{const s=document.createElement('script');s.src='cases.js';s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
function drawViol(){const S=CASES.stat,k=$('#kbb');const bar=(o)=>{const m=Math.max(...Object.values(o));return Object.entries(o).map(([a,b])=>`<div class=row style="margin:2px 0"><span style="width:200px;font-size:12px">${esc(a)}</span><div style="background:#1f5f8b;height:12px;width:${Math.max(2,b/m*300)}px"></div><span class=small>${b.toLocaleString()}</span></div>`).join('')};
 k.innerHTML=`<p>${esc(KB.sources.viol.name)}：共 <b>${S.total.toLocaleString()}</b> 筆查處紀錄（<a href="${KB.sources.viol.url}" target=_blank rel=noopener>data.gov.tw</a>）。內建 2024 年起「處分」案件 ${CASES.cases.length.toLocaleString()} 筆可搜尋。</p>
 <div class=grid2><div><h4>處分法條</h4>${bar(S.byLaw)}<h4>刊播媒體</h4>${bar(S.byMedia)}<h4>常見品名關鍵字（違規產品名稱含此字的件數）</h4>${bar(Object.fromEntries(Object.entries(S.kw).sort((a,b)=>b[1]-a[1]).slice(0,20)))}</div><div><h4>年度件數</h4>${bar(S.byYear)}<h4>查處情形</h4>${bar(S.byResult)}</div></div>
 <h4>搜尋近期處分案例</h4><div class=row><input id=cq placeholder="輸入產品關鍵字，例如：葉黃素、酵素、膠原蛋白" style="flex:1"></div><div class=scroll><table><thead><tr><th>處分日期</th><th>違規產品名稱</th><th>處分機關</th><th>法條</th><th>媒體</th></tr></thead><tbody id=cb></tbody></table></div>`;
 const draw=()=>{const q=$('#cq').value.trim();const r=CASES.cases.filter(c=>!q||c[1].includes(q)).slice(0,200);$('#cb').innerHTML=r.map(c=>`<tr><td>${c[0]}</td><td>${esc(c[1])}</td><td>${esc(c[2])}</td><td>${esc(c[3])}</td><td>${esc(c[4])}${c[5]?'／'+esc(c[5]):''}</td></tr>`).join('')};$('#cq').oninput=draw;draw()}

// ================= 設定 =================
const MODELS={openai:['gpt-4.1','gpt-4.1-mini','gpt-4o','gpt-4o-mini'],anthropic:['claude-sonnet-4-5','claude-opus-4-1','claude-3-7-sonnet-latest'],gemini:['gemini-3-flash-preview','gemini-3.5-flash','gemini-3.6-flash','gemini-3.1-flash-lite','gemini-3.1-pro-preview'],custom:[]};
function setView(){const s=V.settings;return `<div class=grid2><div class=card><h3>AI 金鑰（自備）</h3>
 <p class=small>金鑰${PW?'以您的密碼加密（AES-256-GCM）存放在這台裝置':'在試用模式只存在記憶體，設定密碼後才會加密保存'}，不會上傳到本站或任何第三方；只有在按「AI 深度審核」時，瀏覽器才會直接連到您選擇的 AI 服務。</p>
 <label>AI 服務</label><select id=sp>${['openai','anthropic','gemini','custom'].map(p=>`<option value=${p} ${s.provider===p?'selected':''}>${providerName(p)}</option>`).join('')}</select>
 <div id=baseBox style="display:${s.provider==='custom'?'block':'none'}"><label>API Base URL（OpenAI 相容，例：https://api.example.com/v1）</label><input id=sb value="${esc(s.base)}" style="width:100%"></div>
 <label>API Key</label><div class=row><input id=sk type=password value="${esc(s.key)}" style="flex:1" autocomplete="off" placeholder="貼上您的 API Key"><button class=btn3 id=sks>顯示</button></div>
 <label>模型</label><div class=row><input id=sm list=mlist value="${esc(s.model)}" style="flex:1"><datalist id=mlist>${(MODELS[s.provider]||[]).map(m=>`<option value="${m}">`).join('')}</datalist><button class=btn2 id=bList>取得模型清單</button></div>
 <label class=small><input type=checkbox id=sv ${s.vision?'checked':''}> 圖片與掃描 PDF 直接交給 Vision 模型判讀（模型須支援圖片輸入）</label><br>
 <label class=small><input type=checkbox id=so ${s.autoOcr?'checked':''}> 未設定 AI 時，上傳圖片自動執行本機 OCR</label>
 <div class=row><button class=btn id=bSaveS>儲存設定</button><button class=btn2 id=bTest>測試連線</button><button class=btn2 id=bDelK>清除金鑰</button><span id=sm2 class=small></span></div>
 <p class=small>Gemini 建議：<b>gemini-3-flash-preview</b>（免費額度可用、準確度與速度平衡）；gemini-3.1-pro-preview 準確度最高，但 Google 免費方案的額度為 0，需啟用付費方案；gemini-3.1-flash-lite 最省額度。</p><details><summary class=small>如何取得金鑰</summary><ul class=small><li>OpenAI：platform.openai.com › API keys</li><li>Anthropic Claude：console.anthropic.com › API Keys（本工具以瀏覽器直連，已帶入官方 direct browser access 標頭）</li><li>Google Gemini：aistudio.google.com › Get API key</li><li>OpenAI 相容端點：需支援 /chat/completions 且允許瀏覽器跨來源（CORS）呼叫</li></ul><p class=small>建議為本工具建立專用金鑰並設定用量上限。</p></details></div>
 <div><div class=card><h3>密碼與加密</h3><p>${PW?'<span class=ok>已啟用加密保存</span>':'<span class=bad>試用模式（未加密保存）</span>'}</p><p class=small>AES-256-GCM／PBKDF2-SHA256 ${ITER.toLocaleString()} 次＋隨機 salt；閒置 30 分鐘自動鎖定。</p>
 <div class=row><button class=btn id=bPw>${PW?'變更密碼':'設定密碼並加密保存'}</button><button class=btn2 id=bExp ${PW?'':'disabled'}>匯出加密備份</button><button class=btn2 id=bImp>從備份還原</button></div>
 <div class=row><button class=btn2 id=bWipe style="color:#c62828;border-color:#c62828">清除這台裝置的所有資料</button></div></div>
 <div class=card><h3>隱私說明</h3><ul class=small><li>本站為靜態網頁，沒有後端伺服器，不收集任何資料。</li><li>PDF、Word 解析與 OCR 都在瀏覽器內完成（OCR 首次使用需從 jsDelivr 下載辨識引擎與語言檔，只下載程式與字典，不上傳您的圖片）。</li><li>使用 AI 深度審核時，文案與圖片會直接傳到您選擇的 AI 服務，並受該服務的資料政策約束。</li><li>匯出的報告為明文檔案，請自行妥善保管。</li></ul></div></div></div>`}
function bindSet(){const sp=$('#sp');sp.onchange=()=>{$('#baseBox').style.display=sp.value==='custom'?'block':'none';$('#mlist').innerHTML=(MODELS[sp.value]||[]).map(m=>`<option value="${m}">`).join('');if(!$('#sm').value||Object.values(MODELS).flat().includes($('#sm').value))$('#sm').value=(MODELS[sp.value]||[''])[0]||''};
 $('#sks').onclick=()=>{const k=$('#sk');k.type=k.type==='password'?'text':'password'};
 const read=()=>Object.assign(V.settings,{provider:sp.value,base:$('#sb').value.trim(),key:$('#sk').value.trim(),model:$('#sm').value.trim(),vision:$('#sv').checked,autoOcr:$('#so').checked});
 $('#bSaveS').onclick=async()=>{read();await save();toast(PW?'設定已加密儲存':'試用模式：設定只在記憶體')};
 $('#bDelK').onclick=async()=>{$('#sk').value='';read();await save();toast('已清除金鑰')};
 $('#bTest').onclick=async()=>{read();$('#sm2').textContent='測試中…';try{const t=await ADCAI.callAI(V.settings,'只回覆 JSON。','回覆 {"ok":true}',[],{backoff:1500});$('#sm2').innerHTML='<span class=ok>連線成功</span> '+esc(t.slice(0,40))}catch(e){$('#sm2').innerHTML='<span class=bad>失敗：'+esc(e.message)+'</span>'}};
 $('#bList').onclick=async()=>{read();const s=V.settings;$('#sm2').textContent='讀取模型清單…';try{let ids=[];
  if(s.provider==='gemini'){const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200',{headers:{'x-goog-api-key':s.key}});const j=await r.json();if(!r.ok)throw new Error(j.error?.message||r.status);ids=(j.models||[]).filter(m=>(m.supportedGenerationMethods||[]).includes('generateContent')).map(m=>m.name.replace('models/',''))}
  else if(s.provider==='anthropic'){const r=await fetch('https://api.anthropic.com/v1/models?limit=100',{headers:{'x-api-key':s.key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'}});const j=await r.json();if(!r.ok)throw new Error(j.error?.message||r.status);ids=(j.data||[]).map(m=>m.id)}
  else{const base=s.provider==='custom'?s.base.replace(/\/+$/,''):'https://api.openai.com/v1';const r=await fetch(base+'/models',{headers:{Authorization:'Bearer '+s.key}});const j=await r.json();if(!r.ok)throw new Error(j.error?.message||r.status);ids=(j.data||[]).map(m=>m.id).filter(x=>s.provider==='custom'||/^(gpt|o\d|chatgpt)/.test(x)).sort()}
  $('#mlist').innerHTML=ids.map(m=>`<option value="${esc(m)}">`).join('');$('#sm2').innerHTML='<span class=ok>取得 '+ids.length+' 個模型</span>，點模型欄位即可選擇'}catch(e){$('#sm2').innerHTML='<span class=bad>失敗：'+esc(e.message)+'</span>'}};
 $('#bPw').onclick=setPwDlg;$('#bExp').onclick=exportBackup;$('#bImp').onclick=importBackup;
 $('#bWipe').onclick=()=>{if(confirm('確定清除這台裝置的加密資料、金鑰與審核紀錄？（無法復原）')){localStorage.removeItem(LS);lock()}}}
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});

// ================= PDF 報告 =================
function loadScript(src){return new Promise((res,rej)=>{if(document.querySelector('script[data-src="'+src+'"]'))return res();const s=document.createElement('script');s.src=src;s.dataset.src=src;s.onload=res;s.onerror=()=>rej(new Error('載入失敗：'+src));document.head.appendChild(s)})}
async function exportPdf(){if(!LAST||!LAST.text.trim())return toast('請先完成審核');const btns=$$('[data-pdf]');btns.forEach(b=>{b.disabled=true;b.dataset.t0=b.textContent;b.textContent='PDF 產生中…'});
 const host=document.createElement('div');host.style.cssText='position:fixed;left:-10000px;top:0;width:794px;background:#fff';document.body.appendChild(host);
 try{await loadScript('vendor/html2canvas.min.js');await loadScript('vendor/jspdf.umd.min.js');await document.fonts.ready;
  const {jsPDF}=window.jspdf;const doc=new jsPDF({unit:'mm',format:'a4',compress:true});const PW_=210,PH=297,M=12,HEAD=8,FOOT=10,CW=PW_-2*M,top=M+HEAD,bottom=PH-M-FOOT/2,AH=bottom-top;
  const css=`<style>.pdfb{font-family:"Noto Sans TC","Noto Sans CJK TC","Microsoft JhengHei","PingFang TC","Heiti TC",sans-serif;color:#222;font-size:14px;line-height:1.55;padding:6px 2px;box-sizing:border-box;width:794px}.pdfb h2{font-size:17px;color:#1f5f8b;margin:6px 0 6px;border-left:4px solid #1f5f8b;padding-left:8px}.pdfb table.pm{border-collapse:collapse;width:100%;font-size:12.5px}.pdfb table.pm td{border:1px solid #ddd;padding:4px 6px}.pdfb table.pm td:nth-child(odd){background:#eef3f7;width:72px;white-space:nowrap}</style>`;
  let y=top,page=1;const k=CW/794;
  const newPage=()=>{doc.addPage();page++;y=top};
  for(const blk of pdfBlocks(LAST)){const html=typeof blk==='string'?blk:blk.html;host.innerHTML=css+`<div class=pdfb>${html}</div>`;const el=host.querySelector('.pdfb');
   const cv=await html2canvas(el,{scale:2,backgroundColor:'#ffffff',logging:false,useCORS:false,windowWidth:794});const hmm=cv.height/2*k;
   if(hmm<=bottom-y){doc.addImage(cv.toDataURL('image/jpeg',0.8),'JPEG',M,y,CW,hmm,undefined,'FAST');y+=hmm+2;continue}
   if(hmm<=AH&&!(blk.split&&hmm>AH*0.5)){newPage();doc.addImage(cv.toDataURL('image/jpeg',0.8),'JPEG',M,y,CW,hmm,undefined,'FAST');y+=hmm+2;continue}
   // 過長區塊：在行與行之間切分
   if(bottom-y<25)newPage();let sy=0;const pxPerMm=cv.height/hmm;
   while(sy<cv.height){let take=Math.floor((bottom-y)*pxPerMm);if(sy+take<cv.height)take=findCut(cv,sy,take);const part=document.createElement('canvas');part.width=cv.width;part.height=Math.min(take,cv.height-sy);
    part.getContext('2d').drawImage(cv,0,sy,cv.width,part.height,0,0,cv.width,part.height);const ph=part.height/pxPerMm;doc.addImage(part.toDataURL('image/jpeg',0.8),'JPEG',M,y,CW,ph,undefined,'FAST');sy+=part.height;y+=ph+2;if(sy<cv.height)newPage()}}
  const n=doc.getNumberOfPages();for(let i=1;i<=n;i++){doc.setPage(i);doc.setFontSize(8);doc.setTextColor(120);doc.text(i+' / '+n,PW_/2,PH-M/2-1,{align:'center'});doc.setDrawColor(200);doc.line(M,PH-M-2,PW_-M,PH-M-2);doc.text('Food Ad Compliance Report  '+new Date(LAST.ts).toISOString().slice(0,10),M,M+3)}
  const fn=(LAST.title||'報告').replace(/[\\/:*?"<>|]/g,'_');dl(doc.output('blob'),'廣告審核報告_'+fn+'.pdf');toast('PDF 報告已下載（'+n+' 頁）')}
 catch(e){console.warn(e);alert('PDF 產生失敗：'+e.message)}
 finally{host.remove();btns.forEach(b=>{b.disabled=false;b.textContent=b.dataset.t0})}}
// 找出切點附近的空白列（避免切到文字）
function findCut(cv,sy,take){const ctx=cv.getContext('2d'),w=cv.width,min=Math.floor(take*0.6);
 for(let y=sy+take;y>sy+min;y--){const d=ctx.getImageData(0,y,w,1).data;let dark=0;for(let x=0;x<d.length;x+=16){const v=d[x]+d[x+1]+d[x+2];if(v<600)dark++}if(dark<=2)return y-sy}return take}

// ================= 審核結果（v3：AI 主導、整句改寫） =================
const PRI={red:3,yellow:2,blue:1};
function counts(F){const c={red:0,yellow:0,blue:0};const bl=new Set();F.forEach(f=>{if(f.tier==='blue')bl.add(f.q);else c[f.tier]++});c.blue=bl.size;return c}
function ruleOnly(text){return scan(text,CTX)}
function preScanTxt(text){return ruleOnly(text).filter(f=>f.tier!=='blue').slice(0,60).map(f=>`[${TIER[f.tier]}]「${f.q}」${f.cat}`).join('\n')}
function runScan(live){readCtx();const text=$('#src').value;CTX._draft=text;const prev=LAST;
 LAST={id:prev&&prev.text===text?prev.id:uid(),ts:new Date().toISOString(),title:CTX.title||autoTitle(text),mode:CTX.mode,lic:CTX.lic?CTX.lic[0]:null,licName:CTX.lic?CTX.lic[2]:null,text,findings:[],ai:null,applied:prev?prev.applied||[]:[],polish:prev&&prev.text===text?prev.polish:null,safe:prev&&prev.text===text?prev.safe:null,safeBy:prev&&prev.text===text?prev.safeBy:null};
 if(prev&&prev.ai){const ai=JSON.parse(JSON.stringify(prev.ai));if(prev.text!==text){const used=[];ai.items=ai.items.filter(it=>{const loc=ADCAI.locate(text,it.q,it.s,used);if(!loc||text.slice(loc[0],loc[1])!==it.q)return false;used.push(loc);it.s=loc[0];it.e=loc[1];return true})}LAST.ai=ai}
 if(!LAST.ai)LAST.applied=[];
 mergeAI(LAST);$('#result').innerHTML=resultHtml(LAST);bindResult();if(!live)toast('離線預審完成')}
function mergeAI(L){const R=ruleOnly(L.text);if(!L.ai){L.findings=R;return}
 const A=L.ai.items.map(x=>Object.assign({},x,{ruleHits:[]}));const out=[];
 for(const r of R){if(r.tier==='blue')continue;const hit=r.s>=0?A.find(a=>a.s<r.e&&r.s<a.e):null;
  if(hit){hit.ruleHits.push(r.q+'（'+r.cat+'）');if(PRI[r.tier]>PRI[hit.tier]){hit.tier=r.tier;hit.promoted=true;hit.laws=['FSA28-2','STD5'];hit.basis=hit.laws.map(c=>ADCAI.LAWS[c].name).join('；')+'；'+ADCAI.PEN.red;hit.lawText=ADCAI.lawText(hit.laws)}continue}
  out.push(r)}
 A.forEach(a=>{a.src=a.ruleHits.length?'AI＋規則':'AI'});
 const bad=A.concat(out);const isFree=(s,e)=>!bad.some(b=>b.s>=0&&b.s<e&&s<b.e);
 const blue=R.filter(r=>r.tier==='blue'&&isFree(r.s,r.e));
 for(const b of (L.ai.blue||[])){let i=-1;while((i=L.text.indexOf(b,i+1))>=0){const e=i+b.length;if(isFree(i,e)&&!blue.some(x=>x.s<e&&i<x.e))blue.push({tier:'blue',cat:'AI 判定可保留',s:i,e,q:b,basis:RULES.B.a1,why:'',fix:[],src:'AI',rid:'AIB'})}}
 L.findings=bad.concat(blue).sort((a,b)=>a.s-b.s)}
function hlHtml(text,F){let h='',p=0;const sp=F.filter(f=>f.s>=0).map(f=>({...f,i:F.indexOf(f)})).sort((a,b)=>a.s-b.s);
 for(const f of sp){if(f.s<p)continue;h+=esc(text.slice(p,f.s))+`<mark class="m-${f.tier}" data-f="${f.i}" title="${TIER[f.tier]}：${esc(f.cat)}">${esc(text.slice(f.s,f.e))}</mark>`;p=f.e}return h+esc(text.slice(p))}
function blueChips(F){const m=new Map();F.filter(f=>f.tier==='blue').forEach(f=>m.set(f.q,(m.get(f.q)||0)+1));return [...m.entries()]}
function resultHtml(L){const F=L.findings,c=counts(F);const bad=F.map((f,i)=>({f,i})).filter(x=>x.f.tier!=='blue').sort((a,b)=>PRI[b.f.tier]-PRI[a.f.tier]||a.f.s-b.f.s);
 const pend=bad.filter(x=>x.f.rw).length;const chips=blueChips(F);
 return `<div class=card><h3>審核結果 <span class=small>${esc(L.title)}｜${L.mode==='health'?'健康食品'+(L.lic?'（'+esc(L.lic)+'）':''):'一般食品'}｜${new Date(L.ts).toLocaleString('zh-TW',{hour12:false})}</span></h3>
 <div class=sum><div class="box risk"><span>整體風險</span><b>${riskOf(c)}</b></div><div class="box red"><span>紅線</span><b>${c.red} 處</b></div><div class="box yellow"><span>黃線</span><b>${c.yellow} 處</b></div><div class="box blue"><span>藍線用語</span><b>${c.blue} 個</b></div></div>
 ${L.ai?`<div class=card style="background:#f6f0fb;margin:10px 0 0;padding:8px 12px"><b>AI 深度審核摘要</b>（${esc(L.ai.provider)}・${esc(L.ai.model)}）<div style="white-space:pre-wrap">${esc(L.ai.summary||'')}</div>${(L.ai.miss||[]).length?`<div class=small>另有 ${L.ai.miss.length} 處 AI 標示無法在原文定位，已略過。</div>`:''}</div>`:''}
 <div class="row noprint" style="margin-top:10px">${L.ai&&hasAI()?`<button class=btn id=bPolish style="background:#6a1b9a" ${bad.length?'':'disabled'}>全部套用並潤飾（AI）${pend?'・'+pend+' 處':''}</button>`:`<button class=btn id=bSafe>產生安全版全文</button>`}<button class=btn data-pdf=1 style="background:#c62828">匯出 PDF 報告</button><button class=btn2 id=bRep>匯出其他格式…</button><button class=btn2 id=bSaveH>存入審核紀錄</button></div><div id=polProg class=small></div></div>
 <div class=card><h3>標示文案 <span class=small>點選標示可跳到對應說明</span></h3><div class=hl id=hl>${hlHtml(L.text,F)||'<span class=muted>（無文字）</span>'}</div></div>
 <div class=card><h3>風險項目與修改建議（${bad.length} 處）</h3>${bad.length?bad.map(({f,i},k)=>findHtml(f,i,k)).join(''):'<p class=ok>未偵測到紅線或黃線。仍請依整體表現（圖片、影像、聲音、前後文）綜合判斷。</p>'}
 ${(L.applied||[]).length?`<details><summary>已套用的改寫（${L.applied.length}）</summary>${L.applied.map(a=>`<div class=small style="margin:4px 0"><s>${esc(a.q)}</s> → <b>${esc(a.rw)}</b></div>`).join('')}</details>`:''}</div>
 ${chips.length?`<div class=card><h3>藍線：可保留用語（${chips.length}）</h3><div>${chips.map(([q,n])=>`<span class=pill style="background:#e3f2fd;color:#0d47a1">${esc(q)}${n>1?' ×'+n:''}</span>`).join(' ')}</div><p class=small>依認定準則附件一、附件二（含量合規並寫明營養素主詞）或核准功效原文，可直接保留。</p></div>`:''}
 ${L.safe?safeHtml(L):''}`}
function findHtml(f,i,k){const isAI=!!f.rw;
 return `<div class="f ${f.tier}" id="f${i}"><div><span class="tier t-${f.tier}">${TIER[f.tier]}</span> <b>風險 ${String(k+1).padStart(2,'0')}</b> <span class=small>${esc(f.cat)}</span><span class=src>${esc(f.src)}</span>${f.promoted?'<span class=src>規則判定醫療效能，已提升為紅線</span>':''}</div>
 ${isAI?`<div class=cmp><div><div class=small>原句</div><div class=orig>${esc(f.q)}</div></div><div><div class=small>改寫句（可修改後套用）</div><textarea class=rwbox data-rw="${i}">${esc(f.rw)}</textarea>${(f.alts||[]).length?`<div class=small>其他說法：${f.alts.map((x,j)=>`<button class=btn3 data-alt="${i}" data-j="${j}">${esc(x)}</button>`).join(' ')}</div>`:''}</div></div>`
  :`<div class=q style="margin:4px 0">「${esc(f.q)}」</div>${f.s>=0?`<div class=small>所在句：${esc(sentOf(f))}</div>`:''}`}
 <div style="margin-top:4px"><b class=small>檢核說明</b><div>${esc(f.why)}</div></div>
 <div class=basis><b>法規條例</b>${(f.lawText&&f.lawText.length?f.lawText:[f.basis]).map(t=>`<div>・${esc(t)}</div>`).join('')}${f.lawText?`<div>・${esc(f.tier==='red'?ADCAI.PEN.red:ADCAI.PEN.yellow)}</div>`:''}</div>
 ${(f.ruleHits||[]).length?`<div class=small>離線規則同時命中：${esc(f.ruleHits.join('、'))}</div>`:''}
 ${isAI?`<div class="row noprint"><button class=btn2 data-ap="${i}">套用此改寫</button></div>`
  :`${(f.fix||[]).length?`<ul class=sug>${f.fix.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`:''}${f.s>=0?`<div class="row noprint"><span class=small>替換為</span><input data-rep="${i}" value="${esc(f.rep??'')}" style="flex:1;min-width:160px" placeholder="留空＝刪除此詞"><button class=btn2 data-one="${i}">套用到原文</button></div>${hasAI()?'<div class=small>提示：先執行「AI 深度審核」可取得整句通順的改寫。</div>':''}`:''}`}</div>`}
function safeHtml(L){const P=L.polish;return `<div class=card id=safeCard><h3>${P?'AI 潤飾後全文':'安全版全文'} <span class=small>${L.safeBy==='AI 潤飾'?'已逐句改寫並整體修改文字邏輯與潤澤':'規則式自動替換（草稿，請人工確認語句通順）'}</span></h3>
 ${P?`<div class=row><span class=pill>複審（第 ${P.rounds.length} 輪）</span><span class="tier t-red">紅線 ${P.red}</span><span class="tier t-yellow">黃線 ${P.yellow}</span><span class="tier t-blue">藍線 ${P.blue}</span>${P.red===0&&P.yellow===0?'<span class=ok>複審通過</span>':''}</div>
  ${P.remain.length?`<details ${P.red?'open':''}><summary class=small>複審仍提示的項目（${P.remain.length}）</summary>${P.remain.map(r=>`<div class=small style="margin:3px 0"><span class="tier t-${r.tier}">${TIER[r.tier]}</span> 「${esc(r.q)}」${esc(r.why||'')}${r.rw?'<br>　建議：'+esc(r.rw):''}</div>`).join('')}</details>`:''}`:''}
 <textarea id=safeTxt style="width:100%;min-height:260px;line-height:1.7">${esc(L.safe)}</textarea>
 <div class=row><button class=btn2 id=bCopySafe>複製全文</button><button class=btn2 id=bUseSafe>${P?'以潤飾版取代原文（載入複審結果）':'以安全版取代原文並重新審核'}</button></div>
 ${P?`<details><summary class=small>原稿與潤飾稿對照</summary><div class=cmp><div><div class=small>原稿</div><div class=orig style="white-space:pre-wrap;max-height:400px;overflow:auto">${esc(P.orig)}</div></div><div><div class=small>潤飾稿</div><div class=orig style="white-space:pre-wrap;max-height:400px;overflow:auto;background:#f5fbf5">${esc(P.text)}</div></div></div></details>`:''}</div>`}
function bindResult(){$$('#hl mark').forEach(m=>m.onclick=()=>{const e=$('#f'+m.dataset.f);if(e){$$('.f.sel').forEach(x=>x.classList.remove('sel'));e.classList.add('sel');e.scrollIntoView({behavior:'smooth',block:'center'})}});
 $$('[data-rep]').forEach(inp=>inp.oninput=()=>{LAST.findings[+inp.dataset.rep].rep=inp.value});
 $$('[data-one]').forEach(b=>b.onclick=()=>{const f=LAST.findings[+b.dataset.one];editSpan(f,f.rep||'')});
 $$('[data-rw]').forEach(t=>t.oninput=()=>{const f=LAST.findings[+t.dataset.rw];f.rw=t.value;const it=LAST.ai&&LAST.ai.items.find(x=>x.s===f.s&&x.q===f.q);if(it)it.rw=t.value});
 $$('[data-alt]').forEach(b=>b.onclick=()=>{const i=+b.dataset.alt,t=$(`[data-rw="${i}"]`);t.value=LAST.findings[i].alts[+b.dataset.j];t.dispatchEvent(new Event('input'))});
 $$('[data-ap]').forEach(b=>b.onclick=()=>{const f=LAST.findings[+b.dataset.ap];editSpan(f,f.rw)});
 $$('[data-pdf]').forEach(b=>b.onclick=exportPdf);const s=$('#bSafe');if(s)s.onclick=makeSafe;const po=$('#bPolish');if(po)po.onclick=polishAll;
 const r=$('#bRep');if(r)r.onclick=reportDlg;const h=$('#bSaveH');if(h)h.onclick=()=>saveHist(true);
 const c=$('#bCopySafe');if(c)c.onclick=()=>copy($('#safeTxt').value);const u=$('#bUseSafe');if(u)u.onclick=useSafe}
// 以改寫取代一個片段，保留其他 AI 標示（位置自動平移）
function editSpan(f,rep){const t=LAST.text;if(t.slice(f.s,f.e)!==f.q)return toast('原文已變動，請重新審核');const d=rep.length-(f.e-f.s);
 if(LAST.ai){LAST.ai.items=LAST.ai.items.filter(it=>!(it.s<f.e&&f.s<it.e)).map(it=>{if(it.s>=f.e){it.s+=d;it.e+=d}return it})}
 LAST.applied=(LAST.applied||[]).concat([{q:f.q,rw:rep}]);const nt=t.slice(0,f.s)+rep+t.slice(f.e);$('#src').value=nt;LAST.text=nt;CTX._draft=nt;LAST.safe=null;LAST.polish=null;
 mergeAI(LAST);$('#result').innerHTML=resultHtml(LAST);bindResult();toast('已套用改寫')}
function makeSafe(){let t=LAST.text;const sp=LAST.findings.filter(f=>f.s>=0&&f.tier!=='blue').sort((a,b)=>b.s-a.s);let prev=null;
 for(const f of sp){let rep=f.rw??f.rep??'',e=f.e;if(!rep&&t[e]==='的')e++;if(prev&&prev.s===e&&prev.rep===rep&&rep)rep='';t=t.slice(0,f.s)+rep+t.slice(e);prev={s:f.s,rep}}
 LAST.safe=t.replace(/([，、；])[，、；！。]+/g,'$1').replace(/[，、]+([！。？])/g,'$1').replace(/(^|\n)[，、！。]+/g,'$1').replace(/(營養補給|健康維持)([、，])\1/g,'$1');LAST.safeBy='規則';LAST.polish=null;
 $('#result').innerHTML=resultHtml(LAST);bindResult();$('#safeTxt').scrollIntoView({behavior:'smooth'})}
let BUSY=false;
async function polishAll(){if(BUSY||!LAST||!LAST.ai)return;BUSY=true;const b=$('#bPolish'),pg=$('#polProg');b.disabled=true;const t0=Date.now();
 const log=m=>{const s=m+'（'+Math.round((Date.now()-t0)/1000)+' 秒）';if(pg)pg.textContent=s;status(m)};
 try{const items=LAST.findings.filter(f=>f.tier!=='blue'&&f.rw);const rules=LAST.findings.filter(f=>f.tier!=='blue'&&!f.rw);
  const ruleScan=t=>ruleOnly(t).filter(f=>f.tier!=='blue');
  const res=await ADCAI.polishLoop(V.settings,CTX,LAST.text,items,rules,{log,preScan:preScanTxt,ruleScan,maxLoop:2,onRetry:(n,m)=>log('AI 忙碌，第 '+n+' 次重試…')});
  const ra=res.audit;const extra=ruleScan(res.text).filter(r=>!ra.items.some(a=>a.s<r.e&&r.s<a.e));const remain=ra.items.concat(extra);
  LAST.polish={orig:LAST.text,text:res.text,rounds:res.rounds,audit:ra,red:remain.filter(x=>x.tier==='red').length,yellow:remain.filter(x=>x.tier==='yellow').length,blue:new Set(ra.blue).size,remain:remain.map(x=>({tier:x.tier,q:x.q,why:x.why||x.cat,rw:x.rw||''}))};
  LAST.safe=res.text;LAST.safeBy='AI 潤飾';$('#result').innerHTML=resultHtml(LAST);bindResult();await saveHist();
  toast('潤飾完成：複審紅線 '+LAST.polish.red+'、黃線 '+LAST.polish.yellow);status('潤飾完成');$('#safeCard').scrollIntoView({behavior:'smooth'})}
 catch(e){console.warn(e);alert('潤飾失敗：'+e.message);status('潤飾失敗')}finally{BUSY=false;const b2=$('#bPolish');if(b2)b2.disabled=false}}
function useSafe(){const P=LAST.polish;const txt=$('#safeTxt').value;$('#src').value=txt;
 if(P&&txt===P.text&&LAST.ai){LAST.ai={...LAST.ai,items:P.audit.items,blue:P.audit.blue,summary:'（潤飾稿複審）'+(P.audit.summary||''),miss:P.audit.miss||[]};LAST.text=txt;LAST.applied=[];LAST.polish=null;LAST.safe=null;CTX._draft=txt;mergeAI(LAST);$('#result').innerHTML=resultHtml(LAST);bindResult();toast('已載入潤飾稿與複審結果')}
 else{LAST.ai=null;LAST.safe=null;LAST.polish=null;runScan(false)}}
async function saveHist(manual){if(!LAST||!LAST.text.trim())return;const c=counts(LAST.findings);const h={id:LAST.id,ts:LAST.ts,title:LAST.title,mode:LAST.mode,lic:LAST.lic,licName:LAST.licName,text:LAST.text,findings:LAST.findings,ai:LAST.ai,applied:LAST.applied,polish:LAST.polish,safe:LAST.safe,safeBy:LAST.safeBy,counts:c};
 V.history=V.history.filter(x=>x.id!==h.id);V.history.unshift(h);V.history=V.history.slice(0,300);V.draft=LAST.text;await save();if(manual)toast(PW?'已加密存入審核紀錄':'試用模式：已暫存（設定密碼後才會保存）')}
// ================= AI =================
async function runAI(){if(!hasAI())return toast('請先設定 AI 金鑰');if(BUSY)return;readCtx();const src=$('#src');let text=src.value;const imgs=IMGS.map(i=>i.url).slice(0,8);
 if(!text.trim()&&!imgs.length)return toast('請先輸入文案或上傳圖片');const b=$('#bAI');b.disabled=true;BUSY=true;b.textContent='AI 審核中…';status('正在呼叫 '+providerName(V.settings.provider)+'（'+V.settings.model+'）');
 try{let r=await ADCAI.audit(V.settings,CTX,text,preScanTxt(text),imgs,{onRetry:(n)=>status('AI 忙碌，第 '+n+' 次重試…')});
  if(imgs.length&&r.extracted&&r.extracted.trim()){const ex=r.extracted.trim();if(!text.includes(ex.slice(0,20))){text=(text.trim()?text.trim()+'\n\n':'')+'〔圖片文字（AI Vision 辨識）〕\n'+ex;src.value=text;r=Object.assign(ADCAI.normalizeAudit(text,r.raw),{raw:r.raw})}}
  LAST=null;runScan(true);LAST.ai={provider:providerName(V.settings.provider),model:V.settings.model,overall:r.overall,summary:r.summary,items:r.items,blue:r.blue,miss:r.miss};LAST.applied=[];
  mergeAI(LAST);$('#result').innerHTML=resultHtml(LAST);bindResult();await saveHist();toast('AI 深度審核完成');status('AI 審核完成')}
 catch(e){console.warn(e);alert('AI 審核失敗：'+e.message+'\n\n請確認金鑰、模型名稱與額度；離線規則預審結果仍可使用。');status('AI 審核失敗')}
 finally{BUSY=false;b.disabled=false;b.textContent='AI 深度審核（'+providerName(V.settings.provider)+'）'}}
// ================= 報告匯出 =================
function reportObj(L){const c=counts(L.findings);const bad=L.findings.filter(f=>f.tier!=='blue').sort((a,b)=>PRI[b.tier]-PRI[a.tier]||a.s-b.s);
 return {title:L.title,time:new Date(L.ts).toLocaleString('zh-TW',{hour12:false}),identity:L.mode==='health'?'健康食品'+(L.lic?'（'+L.lic+' '+(L.licName||'')+'）':''):'一般食品',risk:riskOf(c),counts:c,ai:L.ai?{provider:L.ai.provider,model:L.ai.model,summary:L.ai.summary}:null,
 findings:bad.map(f=>({等級:TIER[f.tier],原文:f.q,類別:f.cat,依據:(f.lawText&&f.lawText.length?f.lawText.join('\n'):f.basis),說明:f.why,修改建議:f.rw||(f.fix||[]).join('｜'),來源:f.src,_tier:f.tier,_rw:!!f.rw})),
 blue:blueChips(L.findings).map(x=>x[0]),applied:L.applied||[],text:L.text,safe:L.safe||'',safeBy:L.safeBy||'',polish:L.polish?{red:L.polish.red,yellow:L.polish.yellow,blue:L.polish.blue,rounds:L.polish.rounds.length}:null}}
function toMd(o){return `# 食品廣告法規審核報告：${o.title}\n\n- 審核時間：${o.time}\n- 產品身分：${o.identity}\n- 整體風險：**${o.risk}**（紅線 ${o.counts.red} 處／黃線 ${o.counts.yellow} 處／藍線用語 ${o.counts.blue} 個）\n${o.ai?`- AI 審核：${o.ai.provider}・${o.ai.model}\n\n## AI 摘要\n${o.ai.summary}\n`:''}\n## 風險項目\n\n${o.findings.map((f,i)=>`### 風險 ${String(i+1).padStart(2,'0')}【${f.等級}】${f.類別}\n- 風險文字：「${f.原文}」\n- 檢核說明：${f.說明.replace(/\n/g,' ')}\n- 法規條例：\n${f.依據.split('\n').map(x=>'  - '+x).join('\n')}\n- 調整建議：${f.修改建議||'—'}\n`).join('\n')}\n${o.blue.length?`## 藍線：可保留用語\n${o.blue.join('、')}\n`:''}\n## 原始文案\n\n${o.text}\n${o.safe?`\n## ${o.polish?'AI 潤飾後全文（複審：紅線 '+o.polish.red+'、黃線 '+o.polish.yellow+'）':'安全版全文'}\n\n${o.safe}\n`:''}\n---\n本報告為輔助篩檢，非法律意見，最終以主管機關個案認定為準。\n`}
function toHtml(o){const col={紅線:'#d32f2f',黃線:'#f9a825',藍線:'#1e88e5'};return `<html><head><meta charset="utf-8"><title>${esc(o.title)}</title><style>body{font-family:"Microsoft JhengHei","Noto Sans TC",sans-serif;line-height:1.6}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:4px 6px;vertical-align:top;font-size:10.5pt}th{background:#eef3f7}</style></head><body>
<h1>食品廣告法規審核報告：${esc(o.title)}</h1><p>審核時間：${esc(o.time)}<br>產品身分：${esc(o.identity)}<br>整體風險：<b>${esc(o.risk)}</b>（紅線 ${o.counts.red} 處／黃線 ${o.counts.yellow} 處／藍線用語 ${o.counts.blue} 個）</p>
${o.ai?`<h2>AI 摘要</h2><p>${esc(o.ai.provider)}・${esc(o.ai.model)}</p><p>${esc(o.ai.summary).replace(/\n/g,'<br>')}</p>`:''}
<h2>風險項目</h2><table><tr><th>#</th><th>等級</th><th>風險文字</th><th>檢核說明</th><th>法規條例</th><th>調整建議</th></tr>${o.findings.map((f,i)=>`<tr><td>${i+1}</td><td style="color:${col[f.等級]};font-weight:bold">${f.等級}</td><td>${esc(f.原文)}<br><small>${esc(f.類別)}</small></td><td>${esc(f.說明)}</td><td>${esc(f.依據).replace(/\n/g,'<br>')}</td><td>${esc(f.修改建議)}</td></tr>`).join('')}</table>
${o.blue.length?`<h2>藍線：可保留用語</h2><p>${o.blue.map(esc).join('、')}</p>`:''}<h2>原始文案</h2><p>${esc(o.text).replace(/\n/g,'<br>')}</p>${o.safe?`<h2>${o.polish?'AI 潤飾後全文':'安全版全文'}</h2><p>${esc(o.safe).replace(/\n/g,'<br>')}</p>`:''}<hr><small>本報告為輔助篩檢，非法律意見，最終以主管機關個案認定為準。</small></body></html>`}
function toCsv(o){const q=s=>'"'+String(s??'').replace(/"/g,'""')+'"';return '\ufeff'+['等級,風險文字,類別,檢核說明,法規條例,調整建議,來源',...o.findings.map(f=>[f.等級,f.原文,f.類別,f.說明,f.依據,f.修改建議,f.來源].map(q).join(','))].join('\r\n')}
// PDF：標示文案逐字上色，避免跨行框變形
function hlPdf(text,F,TC,TB){let h='',p=0;const sp=F.filter(f=>f.s>=0).sort((a,b)=>a.s-b.s);const wrap=(s,t)=>[...s].map(ch=>ch==='\n'?'\n':`<span style="background:${TB[t]};box-shadow:inset 0 -2px 0 ${TC[t]}">${esc(ch)}</span>`).join('');
 for(const f of sp){if(f.s<p)continue;h+=esc(text.slice(p,f.s))+wrap(text.slice(f.s,f.e),f.tier);p=f.e}return h+esc(text.slice(p))}
function pdfBlocks(L){const o=reportObj(L),c=o.counts,TC={red:'#d32f2f',yellow:'#f9a825',blue:'#1e88e5'},TB={red:'#ffebee',yellow:'#fff8e1',blue:'#e3f2fd'};const B=[];
 B.push(`<div style="border-bottom:3px solid #1f5f8b;padding-bottom:10px;margin-bottom:4px"><div style="font-size:13px;color:#1f5f8b;font-weight:bold">食品廣告法規審核報告</div><div style="font-size:24px;font-weight:bold;margin:4px 0">${esc(o.title)}</div>
  <table class=pm><tr><td>審核時間</td><td>${esc(o.time)}</td><td>產品身分</td><td>${esc(o.identity)}</td></tr><tr><td>審核方式</td><td>${o.ai?'AI 深度審核（'+esc(o.ai.provider)+'・'+esc(o.ai.model)+'）＋離線規則':'離線規則預審'}</td><td>整體風險</td><td><b style="color:${c.red?TC.red:c.yellow?'#b26a00':'#17803d'}">${esc(o.risk)}</b></td></tr></table></div>`);
 B.push(`<div style="display:flex;gap:10px;margin:6px 0">${[['整體風險',o.risk,'#37474f','#fff'],['紅線',c.red+' 處',TC.red,'#fff'],['黃線',c.yellow+' 處',TC.yellow,'#3a2a00'],['藍線用語',c.blue+' 個',TC.blue,'#fff']].map(x=>`<div style="flex:1;background:${x[2]};color:${x[3]};border-radius:8px;padding:8px 12px"><div style="font-size:12px">${x[0]}</div><div style="font-size:22px;font-weight:bold">${esc(x[1])}</div></div>`).join('')}</div>
  <div style="font-size:11px;color:#555;line-height:1.6"><b style="color:${TC.red}">紅線</b> 涉及醫療效能（食安法第28條第2項）或宣稱保健功效　<b style="color:#b26a00">黃線</b> 不實、誇張或易生誤解（第28條第1項）　<b style="color:${TC.blue}">藍線</b> 附件一、附件二或核准功效，可保留</div>`);
 if(o.ai&&o.ai.summary)B.push(`<h2>AI 深度審核摘要</h2><div style="background:#f6f0fb;border-radius:6px;padding:8px 12px;white-space:pre-wrap">${esc(o.ai.summary)}</div>`);
 B.push({split:true,html:`<h2>標示文案</h2><div style="white-space:pre-wrap;line-height:2;border:1px solid #ddd;border-radius:6px;padding:10px;font-size:14px">${hlPdf(L.text,L.findings,TC,TB)||'（無文字）'}</div>`});
 B.push(`<h2>檢核風險結果（潛在違規 ${o.findings.length} 處）</h2>`+(o.findings.length?'':'<p>未偵測到紅線或黃線。</p>'));
 o.findings.forEach((f,k)=>B.push(`<div style="border:1px solid #ddd;border-left:6px solid ${TC[f._tier]};border-radius:6px;padding:8px 12px;margin:0 0 2px">
  <div><span style="background:${TC[f._tier]};color:${f._tier==='yellow'?'#3a2a00':'#fff'};border-radius:10px;padding:1px 9px;font-size:12px">${f.等級}</span> <b>風險 ${String(k+1).padStart(2,'0')}</b> <span style="font-size:12px;color:#666">${esc(f.類別)}｜${esc(f.來源)}</span></div>
  <div style="display:flex;gap:10px;margin-top:5px"><div style="flex:1"><div style="font-size:11px;color:#888">風險文字</div><div style="background:${TB[f._tier]};border-radius:4px;padding:5px 7px;font-size:13.5px">${esc(f.原文)}</div></div>
  <div style="flex:1"><div style="font-size:11px;color:#888">調整建議</div><div style="background:#f1f8e9;border-radius:4px;padding:5px 7px;font-size:13.5px">${esc(f.修改建議||'—')}</div></div></div>
  <div style="font-size:13px;margin-top:5px"><b>檢核說明：</b>${esc(f.說明)}</div>
  <div style="font-size:11.5px;background:#f3f6f9;border-radius:4px;padding:4px 7px;margin-top:4px;line-height:1.5"><b>法規條例</b><br>${esc(f.依據).replace(/\n/g,'<br>')}</div></div>`));
 if(o.blue.length)B.push(`<h2>藍線：可保留用語（${o.blue.length}）</h2><div style="line-height:2">${o.blue.map(b=>`<span style="background:#e3f2fd;color:#0d47a1;border-radius:10px;padding:2px 9px;margin-right:4px;font-size:13px">${esc(b)}</span>`).join(' ')}</div>`);
 if(o.safe)B.push({split:true,html:`<h2>${o.polish?'AI 潤飾後全文（複審 第'+o.polish.rounds+'輪：紅線 '+o.polish.red+'、黃線 '+o.polish.yellow+'）':'安全版全文（規則式替換草稿，請人工確認）'}</h2><div style="white-space:pre-wrap;line-height:1.9;border:1px solid #cfe3cf;background:#f5fbf5;border-radius:6px;padding:10px;font-size:14px">${esc(o.safe)}</div>`});
 B.push(`<div style="margin-top:8px;border-top:1px solid #ccc;padding-top:6px;font-size:11px;color:#666;line-height:1.6">法規依據：食品安全衛生管理法 §28、§45；健康食品管理法 §6、§14；食品及相關產品標示宣傳廣告涉及不實誇張易生誤解或醫療效能認定準則（113.05.08 修正）附件一、附件二；衛生福利部食品藥物管理署《食品廣告合規輔導指引》（115.05.18 第 1 版）。<br>免責聲明：本報告為輔助篩檢工具產出，非法律意見；廣告是否違規仍須依整體表現綜合判斷，並以主管機關個案認定為準。</div>`);
 return B}
