export const scenarios = {
  find: {
    request: '帮我找 3 条近三个月积分非零的技术负责人线索。先列候选，查重后我来选。',
    steps: ['读懂条件', '筛选候选', '两类查重', '整理结果', '等你确认'],
    phases: ['先确认这次要找什么', '应用条件，读取候选', '检查线索和客户的归属', '把确定与不确定分开', '停在提交之前，等你决定'],
    narration: [
      '本次只筛选与核查，先不领取。积分使用近三个月字段。',
      '按职位与积分条件得到 3 条示例候选。名字出现在列表里，还不代表可以领取。',
      '逐条核查重复销售线索、重复客户与负责人；信息不完整的记录保留待确认。',
      '示例 01 两类归属检查通过；示例 02 有负责人，跳过；示例 03 归属信息不完整。',
      '本轮只有 1 条通过核查。不用零分或待核项补足数量。要领取哪条，由你明确指定。'
    ],
    logs: [[], ['✓ 近三个月积分 > 0', '✓ 职位：技术负责人'], ['✓ 检查重复销售线索', '✓ 检查重复客户'], ['✓ 1 条通过 · 1 条跳过 · 1 条待核'], ['✓ 查询授权不等于领取授权']],
    summaries: ['正在读取本次要求', '候选数量 ≠ 可领取数量', '负责人不明确 → 待核', '结果带编号、链接与核查说明', '只有明确指定 ID，才进入领取流程']
  },
  failed: {
    request: '示例线索 DEMO-01 本次电话未接通。请记录未接通，并将 SDR 呼出状态改为重呼中。',
    steps: ['读懂反馈', '检查已有记录', '保存呼出状态', '补充日常记录', '回读确认'],
    phases: ['只记录你提供的新反馈', '先核对线索与重复记录', '保存“重呼中”状态', '发布“电话联系-未成功”记录', '分别核对两项实际结果'],
    narration: [
      '本次已明确要求两项写回：SDR 呼出状态和日常记录。不推断客户意向。',
      '核对线索身份、历史任务进度与同日同文记录，避免重复发布。',
      '示例中将 SDR 呼出状态保存为“重呼中”，保留之前的跟进内容。',
      '示例中新增一次未接通日常记录。再次呼叫的结果应追加，不能覆盖上次记录。',
      '回读确认状态与日常记录都已保存。若任一提交结果不明，会先核实，不盲目重试。'
    ],
    logs: [[], ['✓ 线索身份匹配', '✓ 本次未找到同日同文记录'], ['✓ SDR 呼出状态已保存'], ['✓ 新增未接通记录'], ['✓ 两项均已回读验证']],
    summaries: ['依据实际电话结果填写', '保留原有跟进记录', '只完成这次授权的字段', '同一天相同原文不重复发布', '演示结束 · 未访问真实 CRM']
  }
};

export function nextState(state, action) {
  const max = scenarios[state.scenario].steps.length - 1;
  if (action.type === 'switch') return {scenario: action.scenario in scenarios ? action.scenario : 'find', step:0, playing:false, claimed:false};
  if (action.type === 'reset') return {...state,step:0,playing:false,claimed:false};
  if (action.type === 'play') return {...state,step:state.step===max ? 0 : state.step,playing:true,claimed:false};
  if (action.type === 'pause') return {...state,playing:false};
  if (action.type === 'next') {
    const step=Math.min(max,state.step+1);
    return {...state,step,playing:step===max ? false : state.playing};
  }
  if (action.type === 'goto') return {...state,step:Math.max(0,Math.min(max,action.step)),playing:false,claimed:false};
  if (action.type === 'confirm' && state.scenario==='find' && state.step===max) return {...state,claimed:true,playing:false};
  return state;
}
