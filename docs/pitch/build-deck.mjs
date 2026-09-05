import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Install the generator outside the application: npm install --prefix /tmp/fellow-pptx pptxgenjs@4.0.1
// DECK_TOOLS_DIR=/tmp/fellow-pptx node docs/pitch/build-deck.mjs
const require = createRequire(import.meta.url);
const toolRoot = process.env.DECK_TOOLS_DIR || '/tmp/futureai-deck-tools-20260905';
const PptxGenJS = require(path.join(toolRoot, 'node_modules/pptxgenjs'));
const root = path.dirname(fileURLToPath(import.meta.url));
const asset = name => path.join(root, 'assets', name);
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.title = 'Fellow 學伴｜讓每一個孩子，都能安心學習';
pptx.subject = '6 頁・120 秒・偏鄉教育與家庭資源 Demo Pitch';
pptx.author = 'Fellow / FutureAI';
pptx.company = 'Fellow';
pptx.lang = 'zh-TW';
pptx.theme = { headFontFace: 'Noto Sans CJK TC', bodyFontFace: 'Noto Sans CJK TC', lang: 'zh-TW' };
const FONT = 'Noto Sans CJK TC';
const C = {
  paper: 'F7F8F4', white: 'FFFFFF', ink: '143B43', navy: '102E38', muted: '6A8286',
  teal: '10AD9C', mint: '74DCC5', mintLight: 'E4F4EE', line: 'D8E3DF',
  blue: '397EA4', blueLight: 'E7F0F7', amber: 'C8823B', amberLight: 'FFF0DB',
  coral: 'C46F5C', coralLight: 'FAE9E1', darkPanel: '1A4048', darkLine: '31545B',
};
const pages = [];
let current;
let seq = 0;
function createSlide(name, duration, bg=C.paper) {
  const s = pptx.addSlide(); s.background = {color:bg}; s.name = name;
  current = {name, duration, bg, objects:[]}; pages.push(current); seq=0;
  return s;
}
function record(kind, options, text='') {
  current.objects.push({kind, ...options, ...(text ? {text} : {})});
}
function box(s,x,y,w,h,fill,opts={}) {
  const {stroke=fill, radius=0, lineWidth=0, transparency=0, name, ...rest}=opts;
  const o={x,y,w,h,fill:{color:fill,transparency},line:{color:stroke,width:lineWidth},
    radius, objectName:name||`Shape ${++seq}`, ...rest};
  s.addShape(radius ? pptx.ShapeType.roundRect : pptx.ShapeType.rect,{...o,rectRadius:radius});
  record('box',{x,y,w,h,fill,stroke,radius,...rest});
}
function circle(s,x,y,d,fill,stroke=fill,lineWidth=0,opts={}) {
  s.addShape(pptx.ShapeType.ellipse,{x,y,w:d,h:d,fill:{color:fill,transparency:opts.transparency||0},
    line:{color:stroke,width:lineWidth},objectName:opts.name||`Circle ${++seq}`});
  record('circle',{x,y,w:d,h:d,fill,stroke,lineWidth});
}
function line(s,x1,y1,x2,y2,color=C.line,width=1,opts={}) {
  const x=Math.min(x1,x2),y=Math.min(y1,y2),w=Math.abs(x2-x1),h=Math.abs(y2-y1);
  s.addShape(pptx.ShapeType.line,{x,y,w,h,flipH:x2<x1,flipV:y2<y1,
    line:{color,width,...opts},objectName:`Connector ${++seq}`});
  record('line',{x,y,w,h,x1,y1,x2,y2,color,width,...opts});
}
function txt(s,text,x,y,w,h,size=18,color=C.ink,opts={}) {
  const o={x,y,w,h,fontFace:FONT,fontSize:size,color,margin:0,vertAnchor:'ctr',valign:'mid',
    breakLine:false,paraSpaceAfterPt:0,fit:'resize',lang:'zh-TW',
    objectName:opts.name||`Text ${++seq}`,...opts};
  // Fixed boxes retain intended typography. No automatic font shrinking.
  delete o.fit;
  s.addText(text,o); record('text',{x,y,w,h,size,color,...opts},text);
}
function pill(s,text,x,y,w,{fill=C.mintLight,color=C.ink,size=10,h=.3}={}) {
  box(s,x,y,w,h,fill,{radius:.14});txt(s,text,x+.08,y,w-.16,h,size,color,{bold:true,align:'center'});
}
function brand(s,section,page,{dark=false}={}) {
  const c=dark?C.mint:C.teal;
  // A small native sprout mark echoes the existing product identity.
  line(s,.66,.32,.66,.56,c,1.6);line(s,.66,.41,.55,.33,c,1.6);line(s,.66,.41,.79,.29,c,1.6);
  circle(s,.51,.27,.11,c);circle(s,.75,.23,.12,c);
  txt(s,'Fellow 學伴',.92,.22,1.8,.35,13,dark?C.white:C.ink,{bold:true});
  txt(s,section,2.67,.25,6.9,.28,9.2,dark?'ADC5C6':C.muted,{charSpacing:1.25});
  txt(s,`${String(page).padStart(2,'0')} / 06`,11.75,.25,.95,.28,9.2,dark?'ADC5C6':C.muted,{align:'right'});
}
function footer(s,label,page,dark=false) {
  line(s,.65,7.12,12.7,7.12,dark?C.darkLine:C.line,.6);
  txt(s,label,.65,7.19,10.8,.19,8.1,dark?'A7C1C0':C.muted);
  const times=['00:00–00:10','00:10–00:30','00:30–00:55','00:55–01:15','01:15–01:35','01:35–02:00'];
  txt(s,times[page-1],11.4,7.17,1.3,.23,8.5,dark?'A7C1C0':C.muted,{align:'right'});
}
function title(s,text,opts={}) {
  txt(s,text,.65,.88,12.05,opts.h||.78,opts.size||31,C.ink,{bold:true,...opts});
}
function frame(s,x,y,w,h,label,{dark=false}={}) {
  box(s,x+.05,y+.07,w,h,dark?'0B232C':'E4EAE6',{radius:.14});
  box(s,x,y,w,h,dark?C.darkPanel:C.white,{radius:.12,stroke:dark?C.darkLine:C.line,lineWidth:.7,name:'DEMO_FRAME'});
  circle(s,x+.18,y+.16,.06,C.teal);
  txt(s,label,x+.34,y+.08,w-.64,.24,9,dark?'D2E7E3':C.muted,{charSpacing:.8});
  line(s,x+.16,y+.4,x+w-.16,y+.4,dark?C.darkLine:C.line,.5);
}
function shot(s,name,x,y,w,h,opts={}) {
  s.addImage({path:asset(name),x,y,w,h,altText:opts.alt||name,objectName:opts.name||`DEMO_${name}`, ...opts});
  record('image',{x,y,w,h,file:name,...opts});
}
function cropped(s,name,x,y,w,h,pixels,alt) {
  const {width,height,left,top,cropW,cropH}=pixels;
  const sx=w/cropW,sy=h/cropH;
  if(Math.abs(sx-sy)>.001)throw new Error(`Distorted crop: ${name}`);
  // PptxGenJS 4 crop measures the source in the scaled, full-image dimensions.
  s.addImage({path:asset(name),x,y,w:width*sx,h:height*sx,
    sizing:{type:'crop',x:left*sx,y:top*sx,w,h},
    altText:alt,objectName:`DEMO_${name}`});
  record('image',{x,y,w,h,file:name,crop:pixels});
}
function phone(s,name,x,y,h,label) {
  const w=h*390/844;
  box(s,x-.045,y-.045,w+.09,h+.09,C.ink,{radius:.12});
  shot(s,name,x,y,w,h);
  if(label)txt(s,label,x-.15,y+h+.11,w+.3,.25,10,C.muted,{bold:true,align:'center'});
  return w;
}
function note(s,script,actions,boundary='') {
  current.script=script;current.actions=actions;current.boundary=boundary;
  s.addNotes(`【${current.name}｜${current.duration} 秒】\n\n口播：\n${script}\n\n畫面與操作：\n${actions}${boundary?'\n\n示範口徑：\n'+boundary:''}`);
}
function sideKey(s,top,lines,bottom,opts={}) {
  const x=10.13;
  line(s,x,2.1,x+.44,2.1,opts.color||C.teal,3);
  txt(s,top,x,2.34,2.4,.33,11,opts.color||C.teal,{bold:true});
  txt(s,lines,x,2.91,2.5,2.0,24,C.ink,{bold:true,breakLine:true,valign:'top',lineSpacingMultiple:1.15});
  if(bottom)txt(s,bottom,x,5.28,2.5,.9,12.2,C.muted,{breakLine:true,valign:'top'});
}

// 01 — The promise. Connected triangle establishes the image that returns at the end.
{
  const s=createSlide('讓每一個孩子，都能安心學習',10,C.navy);
  brand(s,'EDUCATION × SOCIAL IMPACT × AI',1,{dark:true});
  // Fine orbital lines give the AI motif restraint, without a commercial stock visual.
  circle(s,7.93,1.24,4.66,C.navy,C.darkLine,.7);
  circle(s,8.49,1.8,3.54,C.navy,C.darkLine,.5);
  txt(s,'讓每一個孩子，',.7,2.01,7.1,.86,41,C.white,{bold:true});
  txt(s,'都能安心學習',.7,2.98,7.1,.92,46,C.mint,{bold:true});
  txt(s,'用 AI 連結學生、教師與政府，\n讓教育資源真正抵達需要的人。',.74,4.24,6.35,1.04,19,'D4E5E3',{breakLine:true});
  txt(s,'AI-powered Rural Education Support System',.74,5.7,6.6,.32,11.3,'A7C1C0');
  // Links before nodes; all remain editable in PowerPoint.
  line(s,10.26,2.22,8.61,5.11,C.teal,1.3);
  line(s,8.61,5.11,11.95,5.11,C.teal,1.3);
  line(s,11.95,5.11,10.26,2.22,C.teal,1.3);
  line(s,10.26,3.86,10.26,2.22,C.mint,1.2);
  line(s,10.26,3.86,8.61,5.11,C.mint,1.2);
  line(s,10.26,3.86,11.95,5.11,C.mint,1.2);
  for(const [x,y,w,label,sub] of [[9.01,1.47,2.5,'學生／家庭','說出需要'],[7.71,4.79,1.82,'教師','及早關心'],[11.03,4.79,1.82,'政府','資源到位']]) {
    box(s,x,y,w,.93,C.darkPanel,{radius:.15,stroke:C.darkLine,lineWidth:.8});
    txt(s,label,x,y+.14,w,.35,18,C.white,{bold:true,align:'center'});
    txt(s,sub,x,y+.58,w,.23,10,'B1CDC7',{align:'center'});
  }
  circle(s,9.53,3.15,1.46,C.mint,C.navy,5);
  txt(s,'AI',9.66,3.36,1.2,.51,33,C.navy,{bold:true,align:'center'});
  txt(s,'理解・串聯',9.56,3.98,1.4,.24,10,C.navy,{bold:true,align:'center'});
  footer(s,'從一個學生的問題，到一個家庭的改變。',1,true);
  note(s,'Fellow 學伴，用 AI 連結學生家庭、教師與政府，讓孩子找到幫得上忙的下一步。',
    '0:00 出現主標；口播時指向 AI 中央與三方節點。10 秒後切換。此頁與第六頁的三方圖前後呼應。');
}

// 02 — The disconnection. Three explicit gaps, one human problem.
{
  const s=createSlide('不是孩子不想學',20);
  brand(s,'THE PROBLEM',2);
  txt(s,'不是孩子不想學，',.65,.92,11.9,.61,31,C.ink,{bold:true});
  txt(s,'而是生活讓他們無法安心學。',.65,1.58,12,.67,33,C.ink,{bold:true});
  pill(s,'颱風毀損農作  →  家庭收入下降  →  孩子擔心家計',.69,2.47,7.75,{fill:C.amberLight,color:C.amber,size:14,h:.47});
  const nodes=[{x:.7,w:3.05,title:'學生／家庭',sub:'有困難，不知道找誰',fill:C.mintLight},
    {x:5.16,w:3.05,title:'教師',sub:'看見異常，難掌握原因',fill:C.blueLight},
    {x:9.63,w:3.05,title:'政府',sub:'有資源，難找到需求',fill:C.amberLight}];
  for(const n of nodes){
    box(s,n.x,3.41,n.w,1.5,C.white,{radius:.15,stroke:C.line,lineWidth:.65});
    circle(s,n.x+.23,3.68,.48,n.fill);
    txt(s,n.title,n.x+.88,3.65,n.w-1.02,.43,21,C.ink,{bold:true});
    txt(s,n.sub,n.x+.23,4.31,n.w-.46,.3,12.4,C.muted);
  }
  // Each connector is deliberately interrupted. The labels explicitly name all three gaps.
  for(const [a,b,label] of [[3.75,5.16,'Student ↔ Teacher\nGap'],[8.21,9.63,'Teacher ↔ Government\nGap']]) {
    const m=(a+b)/2;
    line(s,a+.07,4.05,m-.13,4.05,C.coral,1.2,{dashType:'dash'});
    line(s,m+.13,4.05,b-.07,4.05,C.coral,1.2,{dashType:'dash'});
    line(s,m-.065,3.95,m+.065,4.15,C.coral,1.4);
    txt(s,label,a-.04,3.33,b-a+.08,.51,8.6,C.coral,{align:'center',breakLine:true});
  }
  line(s,2.22,4.91,2.22,5.4,C.coral,1,{dashType:'dash'});
  line(s,2.22,5.4,5.34,5.4,C.coral,1,{dashType:'dash'});
  line(s,8.02,5.4,11.16,5.4,C.coral,1,{dashType:'dash'});
  line(s,11.16,5.4,11.16,4.91,C.coral,1,{dashType:'dash'});
  txt(s,'Student ↔ Government Gap',5.04,5.2,3.3,.37,10.7,C.coral,{align:'center'});
  txt(s,'教育問題的背後，往往是家庭問題。',.72,5.97,11.9,.47,24,C.ink,{bold:true});
  txt(s,'真正缺少的，是把需求與資源連起來的系統。',.73,6.51,11.9,.3,15.2,C.muted);
  footer(s,'一個颱風後的家庭情境',2);
  note(s,'颱風毀了家裡的收成，孩子擔心收入，課也聽不進去。老師看見他分心，卻未必知道原因；政府有補助，家庭卻不知道怎麼找。教育問題背後，常常還有一道生活的難題。',
    '以家庭、教師、政府順序帶過三個斷點。停在底部系統缺口句。情境為敘事案例，不宣稱真實事件或統計。');
}

// 03 — A large 16:9 demo canvas, with three real product screens as its poster.
{
  const s=createSlide('讓學生敢問，也讓 AI 聽懂',25);
  brand(s,'STUDENT DEMO / 01',3);
  title(s,'讓學生敢問，也讓 AI 聽懂。',{size:33});
  frame(s,.66,1.88,9.15,5.145,'STUDENT DEMO   /   從提問，到看得懂');
  const h=4.03;
  phone(s,'home.png',1.06,2.47,h,'01  進入首頁');
  phone(s,'learning-topics.png',3.96,2.47,h,'02  選主題、提問');
  phone(s,'learning-simulation.png',6.86,2.47,h,'03  回答與互動動畫');
  line(s,3.12,4.29,3.59,4.29,C.teal,1.5,{endArrowType:'triangle'});
  line(s,6.02,4.29,6.49,4.29,C.teal,1.5,{endArrowType:'triangle'});
  sideKey(s,'從回答，到理解','AI 不只回答\n問了什麼，\n更理解為何而問。','依學生情境，\n編排解釋、教材與視覺化。');
  txt(s,'Prompt Engineering /\nHarness Engineering',10.13,6.37,2.6,.48,9.4,C.teal,{breakLine:true,bold:true});
  footer(s,'實際產品截圖・離線情境示範',3);
  note(s,'先從孩子熟悉的提問開始。選一個主題，說出哪裡不懂，學伴就用分步解釋和互動動畫，讓抽象概念變得看得見。透過任務編排，依情境安排解釋、教材和視覺化，也為理解孩子的其他需要，打開入口。',
    '影片預留框：左 0.66、上 1.88、寬 9.15、高 5.145 英吋（16:9）。目前放置三張真實截圖作靜態分鏡；插入影片後覆蓋整個框。25 秒影片：首頁 3 秒 → 選牛頓力學 4 秒 → 提問 4 秒 → 分步解釋 6 秒 → 拖曳 F/m 動畫 8 秒。\n錄影參考路徑：/index.html → /learning-chat.html。',
    '截圖採 offline_demo 離線情境回應與互動模擬，不呼叫外部 AI 模型。Prompt Engineering / Harness Engineering 是系統的任務編排設計；Strong AI Model 即時生成動畫或更多教材為可擴充方向，不能把預製模擬宣稱為現場生成。學生端理解需求是任務分類與澄清，非心理診斷。');
}

// 04 — The same interaction becomes a route into family support.
{
  const s=createSlide('有些學習問題，不能只靠補習解決',20);
  brand(s,'STUDENT & FAMILY DEMO / 02',4);
  title(s,'有些學習問題，不能只靠補習解決。',{size:30.5});
  frame(s,.66,1.88,9.15,5.145,'FAMILY SUPPORT DEMO   /   辨識需求，找到下一步');
  pill(s,'學生說',1.02,2.49,1.05,{fill:C.blueLight,color:C.blue});
  txt(s,'「颱風後，家裡的收成\n變差了。爸媽很擔心，\n我也不知道該怎麼辦。」',1.04,3.02,4.8,1.32,22,C.ink,{bold:true,breakLine:true});
  line(s,1.07,4.64,1.58,4.64,C.amber,2.4);
  txt(s,'AI 釐清：農業災損／經濟需求',1.05,4.92,4.91,.42,16,C.amber,{bold:true});
  txt(s,'可能的資源  →  資格與文件  →  求助窗口',1.05,5.51,4.83,.72,14,C.muted,{breakLine:true});
  const family=fs.existsSync(asset('family-agriculture.png'))?'family-agriculture.png':'family-agriculture-fallback.png';
  phone(s,family,6.96,2.49,4.15);
  line(s,5.69,4.14,6.42,4.14,C.teal,1.7,{endArrowType:'triangle'});
  sideKey(s,'家庭資源，也是教育支持','先接住生活\n的焦慮，\n才有重新專心\n的可能。','讓孩子與家長一起，\n知道下一步可以找誰。',{color:C.amber});
  footer(s,'實際產品截圖・政策為示範資料；申請資格與窗口需確認',4);
  note(s,'如果孩子說：颱風後，家裡收成變差，我很擔心爸媽。學伴就協助釐清農損與經濟需求，整理可能的資源、待確認的資格，以及可以求助的窗口。讓孩子能和家長一起，踏出求助的下一步。',
    '影片預留框：左 0.66、上 1.88、寬 9.15、高 5.145 英吋（16:9）。20 秒：顯示孩子提問 5 秒 → AI 辨識農損需求 4 秒 → 資源卡資格／文件 6 秒 → 聯絡窗口／下一步 5 秒。\n參考路徑：/resource-chat.html?category=agriculture。先準備好回應，避免台上等待生成。',
    '政策為原創示範資料，非即時政府公告，也非資格核定。這段展示求助路徑，沒有宣稱補助已核發。資源抵達家庭、降低焦慮與回到學習是服務目標。');
}

// 05 — Human interpretation and intervention. Only the implemented learning signals are shown.
{
  const s=createSlide('老師需要更早知道，誰需要幫助',20);
  brand(s,'TEACHER DASHBOARD',5);
  title(s,'老師需要更早知道，誰需要幫助。',{size:32});
  frame(s,.66,1.88,9.15,5.145,'TEACHER DEMO   /   從零散提問，到可行動的訊號');
  cropped(s,'teacher-overview.png',.85,2.39,8.77,4.48,
    {width:1440,height:1354,left:248,top:243,cropW:1170,cropH:598},
    '教師總覽：學習提問、學習學生、需要關注、班級共同困難與需關注學生。');
  sideKey(s,'讓老師看見沒說出口的卡點','看見訊號，\n提早關心，\n調整教學。','AI 縮短的，\n是老師與學生之間的距離。');
  pill(s,'經同意的家庭關懷轉介',10.11,6.4,2.59,{fill:C.mintLight,color:C.ink,size:9.5,h:.29});
  txt(s,'設計方向',10.12,6.76,2.54,.19,8,C.muted,{align:'right'});
  footer(s,'教師讀取授權的學習摘要・畫面為 Demo 示範資料',5);
  note(s,'老師這一端，零散提問變成班級卡點、學習趨勢，以及需要關注的學生。老師可以調整教學，也能更早主動關心。家庭需求的下一步，是設計經同意的關懷轉介。',
    '影片預留框：左 0.66、上 1.88、寬 9.15、高 5.145 英吋（16:9）。20 秒：總覽 4 秒 → 班級共同卡點 5 秒 → 需關注學生 5 秒 → 學習洞察／安排複習 6 秒。\n路徑：/teacher.html。畫面數字與姓名均為 Demo 資料。',
    '需關注狀態来自練習等學習訊號，非 AI 判定家庭／心理高風險。現有教師端不讀家庭資源細節。經同意轉介明確標為設計方向；由教師與窗口決定適當協助。');
}

// 06 — Anonymous regional insight + resource return. The closing is the consequence of this page.
{
  const s=createSlide('從區域需求，到資源回到家庭',25,C.white);
  brand(s,'GOVERNMENT DASHBOARD / THE CONNECTION',6);
  txt(s,'當一個問題重複出現，',.65,.89,12.05,.6,30,C.ink,{bold:true});
  txt(s,'它就不再只是個人問題。',.65,1.51,12.05,.59,30,C.ink,{bold:true});
  pill(s,'匿名聚合，不含私人對話',9.55,1.57,3.14,{fill:C.mintLight,color:C.ink,size:11,h:.39});
  frame(s,.65,2.29,8.64,3.96,'GOVERNMENT DEMO   /   地區 × 主題 × 趨勢');
  cropped(s,'government-overview.png',.83,2.75,8.28,8.28*470/1120,
    {width:1440,height:1469,left:274,top:385,cropW:1120,cropH:470},
    '政府匿名需求主題排行與高雄六區需求熱度概念圖；全部為示範資料。');
  txt(s,'服務目標：需求出現 → 主動接觸 → 資源回到家庭',.87,6.29,8.45,.34,13.7,C.ink,{bold:true});
  // Compact connected triangle, centred on AI, with a clear resource-return arrow.
  line(s,11.12,3.1,9.96,5.19,C.teal,1.2);
  line(s,9.96,5.19,12.24,5.19,C.teal,1.2);
  line(s,12.24,5.19,11.28,3.43,C.ink,2,{endArrowType:'triangle'});
  line(s,11.12,4.19,11.12,3.1,C.teal,1);
  line(s,11.12,4.19,9.96,5.19,C.teal,1);
  line(s,11.12,4.19,12.24,5.19,C.teal,1);
  box(s,10.02,2.7,2.19,.68,C.mintLight,{radius:.13});
  txt(s,'學生／家庭',10.02,2.78,2.19,.34,17,C.ink,{bold:true,align:'center'});
  for(const [x,label] of [[9.4,'教師'],[11.68,'政府']]){
    box(s,x,4.93,1.14,.65,C.mintLight,{radius:.12});
    txt(s,label,x,5.03,1.14,.34,17,C.ink,{bold:true,align:'center'});
  }
  circle(s,10.58,3.71,1.08,C.mint,C.white,4);
  txt(s,'AI',10.63,3.9,.98,.4,27,C.navy,{bold:true,align:'center'});
  txt(s,'理解・媒合',10.47,4.74,1.28,.22,9.1,C.muted,{align:'center'});
  txt(s,'資源回流',11.88,3.88,.69,.62,10,C.ink,{bold:true,breakLine:true,align:'center'});
  txt(s,'系統目標：孩子安心學習',9.54,5.88,3.16,.38,12.8,C.ink,{bold:true,align:'center'});
  line(s,.68,6.81,12.7,6.81,C.line,.6);
  txt(s,'讓資源找到孩子，而不是讓孩子自己尋找資源。',.68,6.87,12.03,.45,22.1,C.ink,{bold:true});
  txt(s,'實際產品截圖・匿名 Demo 資料；地圖為區域概念圖',.69,7.36,10,.12,7.2,C.muted);
  note(s,'政府看到的，是匿名聚合後的區域需求。當某地農損與經濟求助增加，就能成為主動了解、調整服務的線索。我們要把需求接到窗口，再把資源帶回家庭。讓資源找到孩子，而不是讓孩子自己尋找資源。',
    '1:35–1:50：政府 Demo，指向問題類型、地圖與需求變化。影片主框：左 0.65、上 2.29、寬 8.64、高 3.96 英吋；建議錄影輸出 1920×880 並保留完整內容，不拉伸16:9影片。\n1:50–2:00：停在三方連結圖，用手勢沿政府 → 學生／家庭箭頭，講完資源回流與 Closing。\n路徑：/government.html；可以切地區分析或趨勢洞察，回到總覽收尾。',
    '政府看不到學生私密對話，僅看匿名化聚合。截圖是高雄六區示範資料，不代表真實颱風後統計。資源回到家庭、改善壓力與安心學習是系統目標，目前 Demo 不證明服務轉介或補助核發已完成。');
}

const out=path.join(root,'Fellow-安心學習-6頁DemoPitch.pptx');
await pptx.writeFile({fileName:out,compression:true});
fs.writeFileSync(path.join(root,'deck-layout.json'),JSON.stringify({width:13.333333,height:7.5,pages},null,2));
const timings=['0:00–0:10','0:10–0:30','0:30–0:55','0:55–1:15','1:15–1:35','1:35–2:00'];
const notes=[
  '# Fellow 學伴｜6 頁・120 秒 Demo Pitch 講稿',
  '',
  '原始七個段落整合為六頁：封面與問題定義各自保留，Government Dashboard 與 Closing 共用最後一頁。1:35–1:50 看政府端，1:50–2:00 停在三方圖與結語。',
  '',
  '講稿也已放入 PowerPoint 每頁的「備忘稿」。全長配置為 120 秒；字數已精簡以預留操作停頓，實際語速請於錄影前試講一次。',
  '',
  '| 頁 | 時間 | 核心訊息 |',
  '| --- | --- | --- |',
  ...pages.map((p,i)=>`| ${i+1} | ${timings[i]} | ${p.name} |`),
  '',
];
for(const [i,p] of pages.entries())notes.push(
  `## ${i+1}｜${p.name}｜${timings[i]}`,'',p.script,'',
  '**操作分鏡**','',p.actions,'',
  ...(p.boundary?['**示範口徑（不需口播）**','',p.boundary,'']:[]),
);
notes.push('## Demo 影片替換方式','','目前以真實產品截圖作為影片區的靜態分鏡，尚未嵌入操作錄影。',
  '',
  '1. 在 PowerPoint 選擇「插入 → 影片 → 此裝置」，使用本機 MP4。',
  '2. 在「大小與位置」輸入該頁操作分鏡列出的座標，放到最上層，覆蓋白色 Demo 框。背景與各圖物件名稱含 `DEMO_`，也可從選取窗格移除。',
  '3. 第 3–5 頁使用 16:9 影片。第 6 頁框為 24:11，建議錄影輸出 1920×880；若用 16:9，請保留比例並接受留白。',
  '4. 「播放」設定為「自動」，關閉循環播放；第 6 頁影片停在可供結語使用的總覽畫面。',
  '5. 簡報預設手動換頁，依備忘稿時間控制；PDF 是靜態備份。',
  '',
  '文字與三方關係圖皆為 PowerPoint 原生可編輯物件。圖片已嵌入，簡報不依賴本機路徑或網路。字體使用 Noto Sans CJK TC；若電腦沒有此字體，可改用微軟正黑體並再次檢查換行。PDF 已內嵌字體。',
  '',
);
fs.writeFileSync(path.join(root,'Fellow-120秒講稿與Demo分鏡.md'),notes.join('\n'));
console.log(`Created ${pages.length} slides; ${pages.reduce((a,p)=>a+p.duration,0)} seconds: ${out}`);
