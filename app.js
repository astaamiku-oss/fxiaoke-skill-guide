import {scenarios,nextState} from './demo-model.js';
const $ = (id) => document.getElementById(id);
const escape = (value) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let state={scenario:'find',step:0,playing:false,claimed:false};
let timer;

function renderDemo() {
  const model=scenarios[state.scenario];
  $('demo-request').textContent=model.request;
  $('demo-phase').textContent=state.claimed ? '已完成本次模拟领取' : model.phases[state.step];
  $('demo-narration').textContent=state.claimed ? '示例 01 在提交前再次核查归属，模拟单次领取，并回读负责人为“演示用户”。真实任务也只处理你刚刚指定的 ID。' : model.narration[state.step];
  const logs=state.claimed ? ['✓ 仅领取已指定的 DEMO-01','✓ 提交一次，回读结果'] : model.logs[state.step];
  $('demo-log').innerHTML=logs.map(x=>`<div class="log-row"><span class="log-check">✓</span><span>${escape(x.replace(/^✓ /,''))}</span></div>`).join('');
  $('demo-summary').textContent=state.claimed ? '模拟领取完成 · 实际未访问任何客户记录' : model.summaries[state.step];
  $('crm-title').textContent=state.scenario==='find' ? '线索池' : '线索详情';
  $('crm-content').innerHTML=state.scenario==='find' ? findPreview() : failedPreview();
  $('demo-note').innerHTML=state.scenario==='find'
    ? state.claimed ? '<strong>✓ 模拟回读：负责人为演示用户，已离开公共库。</strong>' : state.step>=3 ? '核查结果：1 条通过，1 条跳过，1 条待确认。<br>“待确认”不会被当作“无负责人”。' : '示例记录只用于解释流程。列表出现一条线索，不代表可以直接领取。'
    : state.step===4 ? '<strong>✓ 模拟回读：两项写回均已确认。</strong>' : '只记录已知反馈，原有记录保留。提交结果不明时，先核查再继续。';
  $('demo-timeline').innerHTML=model.steps.map((step,index)=>`<button class="timeline-step ${index===state.step ? 'active' : index<state.step ? 'done' : ''}" data-step="${index}" ${index===state.step ? 'aria-current="step"' : ''} aria-label="查看步骤 ${index+1}：${escape(step)}"><span>${index<state.step?'✓':index+1}</span>${escape(step)}</button>`).join('');
  $('play-label').textContent=state.playing ? '暂停' : state.step===4 ? '重新播放' : state.step===0 ? '播放演示' : '继续播放';
  $('play-symbol').textContent=state.playing ? 'Ⅱ' : '▶';
  $('next-demo').disabled=state.step===4;
  $('step-counter').textContent=`0${state.step+1} / 05`;
  $('demo-panel').classList.toggle('is-playing',state.playing);
  $('demo-panel').setAttribute('aria-labelledby',`tab-${state.scenario}`);
}

function findPreview() {
  const chips=['职位：技术负责人','近三个月积分 > 0','数量：3 条'];
  let html=`<div class="mock-title"><h4>${state.claimed ? '领取结果' : '公共库线索'}</h4><span>${state.step===0 ? '等待筛选' : '3 条示例记录'}</span></div><div class="filter-chips">${chips.map((x,i)=>`<span class="filter-chip ${state.step>0?'enabled':''}" style="animation-delay:${i*70}ms">${x}</span>`).join('')}</div>`;
  if (state.step===0) return html+'<div class="empty-table"><svg><use href="#i-search"/></svg>条件准备好了<br>开始演示，看看 AI 如何筛选</div>';
  const rows=[{name:'示例线索 01',id:'DEMO-01',role:'技术负责人',score:24,status:state.claimed?'模拟领取完成':state.step>=2?'两类核查通过':'尚未核查',class:state.step>=2?'good':''},{name:'示例线索 02',id:'DEMO-02',role:'技术负责人',score:18,status:state.step>=2?'有负责人 · 跳过':'尚未核查',class:state.step>=2?'skip':''},{name:'示例线索 03',id:'DEMO-03',role:'技术负责人',score:9,status:state.step>=2?'归属待确认':'尚未核查',class:state.step>=2?'warn':''}];
  html+=`<table class="lead-table"><thead><tr><th>姓名 / 编号</th><th>职位</th><th>近三月积分</th><th>归属核查</th></tr></thead><tbody>${rows.map((r,i)=>`<tr class="${state.step>=3?(i===0?'accepted':i===1?'skipped':''):''}"><td><span class="lead-name">${r.name}</span><span class="lead-id">${r.id}</span></td><td>${r.role}</td><td>${r.score}</td><td><span class="lead-status ${r.class}">${r.status}</span></td></tr>`).join('')}</tbody></table>`;
  if(state.step===4&&!state.claimed) html+='<button class="confirm-demo" id="confirm-claim">模拟确认：仅领取示例 01 <span>→</span></button>';
  return html;
}

function failedPreview() {
  return `<div class="mock-title"><h4>示例线索 01</h4><span>DEMO-01</span></div><div class="record-card"><div><span>本次通话反馈</span><span>电话未接通</span></div><div ${state.step>=2?'class="record-highlight"':''}><span>SDR 呼出状态</span><span>${state.step>=2?'重呼中 ✓':'待更新'}</span></div><div><span>日常记录</span><span>${state.step>=3?'电话联系-未成功 ✓':'待发布'}</span></div></div><h4 style="font-size:10px;color:#8b8176">跟进记录（仅展示本例）</h4>${state.step>=3?'<div class="history-entry"><strong>电话联系-未成功</strong>本次电话未接通，后续继续联系。<br><span class="small-muted">演示用户 · 本次新增</span></div>':'<p class="history-placeholder">等待本次新增记录，原有记录保持保留。</p>'}`;
}

function dispatch(action) {
  clearTimeout(timer);
  state=nextState(state,action);
  renderDemo();
  if(state.playing) timer=setTimeout(()=>dispatch({type:'next'}),reduceMotion?4500:3600);
}
$('play-demo').addEventListener('click',()=>dispatch({type:state.playing?'pause':'play'}));
$('next-demo').addEventListener('click',()=>dispatch({type:'next'}));
$('reset-demo').addEventListener('click',()=>dispatch({type:'reset'}));
$('demo-timeline').addEventListener('click',event=>{const button=event.target.closest('[data-step]');if(button)dispatch({type:'goto',step:Number(button.dataset.step)});});
$('crm-content').addEventListener('click',event=>{if(event.target.closest('#confirm-claim')){dispatch({type:'confirm'});showToast('模拟领取完成；没有操作真实 CRM');}});
document.querySelectorAll('[data-demo]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-demo]').forEach(b=>{const selected=b===button;b.classList.toggle('selected',selected);b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});
  dispatch({type:'switch',scenario:button.dataset.demo});
}));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.playing)dispatch({type:'pause'});});

let toastTimer;
function showToast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('visible');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2800);}
async function copyText(text){
  try {
    if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);}
    else{const area=document.createElement('textarea');area.value=text;area.style.cssText='position:fixed;top:0;left:-9999px';document.body.append(area);area.select();const copied=document.execCommand('copy');area.remove();if(!copied)throw new Error('copy failed');}
    showToast('已复制，发给你的 AI 即可');
  } catch {showToast('浏览器未允许复制，请选中这段文字手动复制');}
}
document.querySelectorAll('[data-copy]').forEach(button=>button.addEventListener('click',()=>copyText(button.dataset.copy)));
let os=navigator.userAgent.includes('Windows')?'windows':'mac';
function updateInstall(){
  const agent=$('agent-select').selectedOptions[0].textContent;
  document.querySelectorAll('[data-os]').forEach(b=>{const selected=b.dataset.os===os;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
  $('install-target').textContent=`${os==='mac'?'macOS':'Windows'} / ${agent}`;
  $('platform-note').textContent=os==='mac'?'当前包已做离线检查；新用户 Mac 全流程仍需试用验收。':'Windows 已做兼容处理，尚未完成真机全流程验收；遇到环境问题请保留错误原文。';
  $('install-prompt').textContent=`我使用 ${os==='mac'?'macOS':'Windows'} 和 ${agent}。请读取这个解压包的 fxiaoke-lead-claim/SKILL.md 和 README.md，把技能安装到我正在使用的这一个 AI。只使用我的账号，不覆盖已有技能；安装完成后引导我检查 ego lite、纷享销客登录和公共库权限。CRM 只读，先不要领取或录入。需要我登录、授权系统权限或确认接管时告诉我。`;
}
document.querySelectorAll('[data-os]').forEach(button=>button.addEventListener('click',()=>{os=button.dataset.os;updateInstall();}));
$('agent-select').addEventListener('change',updateInstall);
$('copy-install').addEventListener('click',()=>copyText($('install-prompt').textContent));

const prompts={
  find:{title:'把筛选条件说具体一点',category:'只读查询',result:'带编号和详情链接的候选清单、近三个月积分，以及归属检查结果与待核风险。数量不足会如实说明。',boundary:'查询和列候选不会自动领取。近三个月积分与总积分是两个不同字段。'},
  duplicate:{title:'先查清楚，再决定要不要领',category:'只读核查',result:'重复销售线索和重复客户两类结果、已有负责人，以及是否需要继续核实。',boundary:'缺少结果或负责人不明确时标为待确认，不能直接称为可领取。'},
  claim:{title:'只领取你已经选定的线索',category:'明确授权后写入',result:'每条指定 ID 的实时归属核查、领取结果和回读验证；不合规或不确定项会停止。',boundary:'请用候选清单里的真实 ID 替换占位内容。不会自动更换候选或扩大领取范围。'},
  failed:{title:'未接通的两项工作，一句话交代',category:'明确授权后写入',result:'将 SDR 呼出状态保存为重呼中，发布电话联系-未成功的日常记录，再分别核验。',boundary:'只根据你给的新反馈填写；已存在的同日同文记录不重复发布，也不覆盖以前的跟进记录。'},
  history:{title:'了解最新跟进，不误当成全部历史',category:'读取范围有限',result:'线索基本信息、最新跟进摘要，并明确这次实际读取的范围。',boundary:'当前包未实现通用的完整历史动态读取；不要用最新摘要推断全部历史。'},
  preferences:{title:'把你的常用条件，记成你的默认值',category:'保存个人偏好',result:'仅在你明确要求后保存个人偏好，并复述保存内容。下次的明确要求仍优先。',boundary:'团队默认不继承制作者的职位、积分门槛或个人名单；同公司去重默认开启。'}
};
let activePrompt='find';
const draft={count:'3',role:'技术负责人',score:'nonzero',ids:''};
function selectPrompt(key){
  activePrompt=key;
  const item=prompts[key];
  document.querySelectorAll('[data-prompt]').forEach(b=>{const selected=b.dataset.prompt===key;b.classList.toggle('selected',selected);b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});
  $('prompt-panel').setAttribute('aria-labelledby',`prompt-tab-${key}`);
  $('prompt-category').textContent=item.category;
  $('prompt-category').className=`tag ${['claim','failed','history'].includes(key)?'yellow':'blue'}`;
  $('prompt-title').textContent=item.title;
  $('prompt-result').textContent=item.result;
  $('prompt-boundary').textContent=item.boundary;
  if(key==='find'){
    $('prompt-fields').innerHTML=`<label class="prompt-field">想看几条<input id="filter-count" type="number" min="1" max="50" value="${draft.count}"></label><label class="prompt-field">优先职位<select id="filter-role"><option>技术负责人</option><option>架构师</option><option>CIO / CTO</option><option>创始人</option><option>不限定职位</option></select></label><label class="prompt-field">近三个月积分<select id="filter-score"><option value="nonzero">非零</option><option value="any">不限制</option></select></label>`;
    $('filter-role').value=draft.role;$('filter-score').value=draft.score;
    $('filter-count').addEventListener('input',event=>{draft.count=event.target.value;updatePromptText();});
    $('filter-role').addEventListener('change',event=>{draft.role=event.target.value;updatePromptText();});
    $('filter-score').addEventListener('change',event=>{draft.score=event.target.value;updatePromptText();});
  }else if(['duplicate','claim','failed','history'].includes(key)){
    $('prompt-fields').innerHTML=`<label class="prompt-field">填入你的线索 ID（可先留空）<input id="lead-ids" type="text" placeholder="在这里填入真实的 OB ID" value="${escape(draft.ids)}" autocomplete="off"></label>`;
    $('lead-ids').addEventListener('input',event=>{draft.ids=event.target.value;updatePromptText();});
  }else{$('prompt-fields').innerHTML='';}
  updatePromptText();
}
function updatePromptText(){
  const ids=draft.ids.trim()||'【填入线索 OB ID】';
  let text;
  if(activePrompt==='find'){
    const count=Math.max(1,Math.min(50,Number(draft.count)||3));
    const position=draft.role==='不限定职位'?'不限定职位':`优先${draft.role}`;
    text=`用纷享销客线索技能，帮我从公共库找 ${count} 条线索，${position}，${draft.score==='nonzero'?'近三个月积分非零':'本次不限制近三个月积分'}。只筛选和查重，先列带详情链接的候选，说明负责人及待核风险，不领取。${draft.score==='nonzero'?'数量不足直接说明，不用零分或积分不明的线索补齐。':''}`;
  }else if(activePrompt==='duplicate')text=`帮我核查线索 ${ids}，同时检查重复销售线索和重复客户，列出负责人和待确认项。只读查询，不领取、不修改。`;
  else if(activePrompt==='claim')text=`请只领取我这次明确选定的线索：${ids}。提交前逐条重新核查重复线索、重复客户和负责人，核查通过后再领取并回读验证。结果不确定时停止，不要换成其他线索，也不要重复提交。`;
  else if(activePrompt==='failed')text=`线索 ${ids} 本次电话未接通。请发布“电话联系-未成功”日常记录，并将 SDR 呼出状态保存为“重呼中”，完成后分别回读验证。保留之前的跟进记录；同日同文已完成的不重复发布。`;
  else if(activePrompt==='history')text=`帮我读取线索 ${ids} 的基本信息和最新跟进摘要，说明目前能看到的内容及读取范围。只读，不修改。若没有完整历史，就明确说明，不把最新摘要当作全部历史。`;
  else text='以后默认优先找技术负责人和架构师，近三个月积分非零，并要求有公司名称。请将这些保存为我的个人筛选偏好，说明具体保存了什么。本次不查询、不领取，也不更改别人的偏好。';
  $('prompt-text').textContent=text;
}
document.querySelectorAll('[data-prompt]').forEach(button=>button.addEventListener('click',()=>selectPrompt(button.dataset.prompt)));
document.querySelectorAll('[data-prompt-link]').forEach(link=>link.addEventListener('click',()=>selectPrompt(link.dataset.promptLink)));
$('copy-prompt').addEventListener('click',()=>copyText($('prompt-text').textContent));

// Keyboard traversal for both tab groups; the mobile prompt grid also accepts arrows.
document.querySelectorAll('[role="tablist"]').forEach(list=>list.addEventListener('keydown',event=>{
  const tabs=[...list.querySelectorAll('[role="tab"]')];
  const index=tabs.indexOf(event.target);if(index<0)return;
  let next;if(['ArrowRight','ArrowDown'].includes(event.key))next=(index+1)%tabs.length;
  else if(['ArrowLeft','ArrowUp'].includes(event.key))next=(index-1+tabs.length)%tabs.length;
  else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;
  event.preventDefault();tabs[next].focus();tabs[next].click();
}));
const navLinks=[...document.querySelectorAll('.nav-link')];
const observer=new IntersectionObserver(entries=>{
  const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];
  if(visible)navLinks.forEach(link=>{const active=link.hash===`#${visible.target.id}`;link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
},{rootMargin:'-8% 0px -65% 0px',threshold:0});
document.querySelectorAll('.section-anchor').forEach(section=>observer.observe(section));

renderDemo();updateInstall();selectPrompt('find');
