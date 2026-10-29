// Every value in this module is fabricated. IDs are generated in an isolated
// demo namespace and have no correspondence with customer or source records.
export const FIXTURE_NOW = '2026-10-26 10:30:00';
export const ACTOR_STAFF_ID = 90001;

export const STATUS_OPTIONS = [
  { value: '4', label: '待分配' },
  // Only value 4 is defined by the source UI; other labels are mock identifiers
  // because the real /statusList response is deliberately never requested.
  { value: '待处理', label: '待处理' },
  { value: '处理中', label: '处理中' },
  { value: '已完成', label: '已完成' },
  { value: '已关闭', label: '已关闭' },
];

export const GAME_GROUPS = [
  { value: '8101', label: '星海远征（演示）' },
  { value: '8102', label: '云上冒险（演示）' },
  { value: '8103', label: '秘境物语（演示）' },
];
export const GAMES = GAME_GROUPS.flatMap((group, groupIndex) => [
  { value: String(8201 + groupIndex * 2), label: `${group.label} · 专服`, gameGroupId: Number(group.value), serverName: 'special' },
  { value: String(8202 + groupIndex * 2), label: `${group.label} · 混服`, gameGroupId: Number(group.value), serverName: 'mixed' },
]);
export const TEAMS = [
  { id: 8301, name: '综合客服组（演示）' },
  { id: 8302, name: '游戏支持组（演示）' },
  { id: 8303, name: '技术协助组（演示）' },
];
export const WORK_ORDER_TYPES = [
  { id: 8401, name: '充值问题' },
  { id: 8402, name: '账号问题' },
  { id: 8403, name: '游戏建议' },
  { id: 8404, name: '异常反馈' },
];
export const STAFF = [
  { staffId: ACTOR_STAFF_ID, userId: ACTOR_STAFF_ID, customerName: '演示客服甲', onlineStatus: 1, canTransfer: true },
  { staffId: 90002, userId: 90002, customerName: '演示客服乙', onlineStatus: 1, canTransfer: true },
  { staffId: 90003, userId: 90003, customerName: '演示客服丙', onlineStatus: 2, canTransfer: true },
  { staffId: 90004, userId: 90004, customerName: '演示客服丁', onlineStatus: 3, canTransfer: false },
];
export const LANGUAGES = [
  { value: 'zh_cn', label: '简体中文' },
  { value: 'en', label: '英语' },
  { value: 'ja', label: '日语' },
];
export const FAST_REPLIES = [
  { id: 8601, itemId: 8601, groupId: 8701, groupName: '常用答复', isTop: 1, replyContent: '您好，已收到您的反馈，我们正在核实，请您稍候。', zhCnReplyContent: '您好，已收到您的反馈，我们正在核实，请您稍候。', replyI18n: { zh_cn: '您好，已收到您的反馈，我们正在核实，请您稍候。', en: 'We have received your demo feedback and are checking it.' } },
  { id: 8602, itemId: 8602, groupId: 8701, groupName: '常用答复', isTop: 0, replyContent: '请提供问题发生的时间与操作步骤，方便进一步排查。', zhCnReplyContent: '请提供问题发生的时间与操作步骤，方便进一步排查。', replyI18n: { zh_cn: '请提供问题发生的时间与操作步骤，方便进一步排查。', en: 'Please provide the time and steps for this demo issue.' } },
];

export const SYNTHETIC_IMAGE = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#e8f1fb"/><rect x="70" y="60" width="500" height="240" rx="8" fill="white" stroke="#b9cee8"/><path d="M130 240l90-90 65 70 70-95 145 115" stroke="#81a9d8" stroke-width="12" fill="none"/><circle cx="180" cy="110" r="18" fill="#c5dbf3"/><text x="320" y="330" text-anchor="middle" font-family="Arial" font-size="18" fill="#54739a">SYNTHETIC DEMO IMAGE</text></svg>');

function pad(value) { return String(value).padStart(2, '0'); }
function fixtureDate(index, hour = 10) { return `2026-10-${pad(1 + index % 25)} ${pad(hour)}:${pad(index % 60)}:00`; }

export function createInputParams(index) {
  return {
    fields: [
      { id: 'demo-subject', name: 'subject', label: '问题描述', type: 'textarea', required: true, value: `演示反馈 ${index + 1}：完成指定操作后页面未按预期更新，请协助核实。此处所有内容均为合成测试数据。` },
      { id: 'demo-category', name: 'category', label: '问题类型', type: 'select', options: [{ label: '充值未到账', value: 'payment' }, { label: '道具显示异常', value: 'item' }], value: index % 2 ? 'item' : 'payment' },
      { id: 'demo-order', name: 'orderNo', label: '订单编号', type: 'input-text', value: `DEMO-ORDER-${String(index + 1).padStart(4, '0')}` },
      { id: 'demo-amount', name: 'amount', label: '充值金额', type: 'input-number', value: (index % 5 + 1) * 6 },
      { id: 'demo-time', name: 'occurredAt', label: '发生时间', type: 'input-date', props: { showTime: true, dateFormat: 'YYYY-MM-DD HH:mm:ss' }, value: fixtureDate(index, 8) },
      { id: 'demo-range', name: 'affectedRange', label: '影响时段', type: 'input-dateRange', value: [fixtureDate(index, 8), fixtureDate(index, 10)] },
      { id: 'demo-channel', name: 'contactMethod', label: '反馈渠道', type: 'radios', options: [{ label: '游戏内反馈', value: 'game' }, { label: '客服中心', value: 'support' }], value: 'game' },
      { id: 'demo-attempts', name: 'attempted', label: '已尝试操作', type: 'checkboxes', options: [{ label: '重新登录', value: 'login' }, { label: '切换网络', value: 'network' }], value: ['login', 'network'] },
      { id: 'demo-image', name: 'screenshots', label: '问题截图', type: 'input-image', value: [SYNTHETIC_IMAGE] },
    ],
  };
}

function createChatMessages(id, recordType) {
  return Array.from({ length: 54 }, (_, index) => {
    const isUser = index % 2 === 0;
    const isSystem = recordType === 'HUMAN' && index === 15;
    const isImage = index === 10 || index === 49;
    const text = isUser
      ? `演示玩家咨询 ${index + 1}：请协助查看本次测试问题的处理进展。`
      : `演示答复 ${index + 1}：已记录该测试问题，核查后会继续在此回复。`;
    return {
      replayId: `${id}-${recordType}-${index + 1}`,
      messageRole: isSystem ? '系统' : isUser ? 'USER' : recordType === 'AI' ? 'ai' : 'ADMIN',
      intent: recordType === 'AI' ? '问题咨询' : undefined,
      messageTime: `2026-10-25 ${pad(8 + Math.floor(index / 60))}:${pad(index % 60)}:00`,
      originalContent: isImage ? SYNTHETIC_IMAGE : isSystem ? '演示客服甲已认领反馈' : index % 3 === 0 ? `Demo message ${index + 1}: please check this synthetic test case.` : text,
      targetContent: isImage ? SYNTHETIC_IMAGE : isSystem ? '演示客服甲已认领反馈' : text,
      messageType: isImage ? 'IMAGE' : 'TEXT',
      nickName: isSystem ? '系统消息' : isUser ? '演示玩家' : recordType === 'AI' ? 'AI 客服' : '演示客服甲',
      sourceLanguage: index % 3 === 0 ? 'en' : 'zh_cn',
      sensitiveImage: isImage && index === 49,
    };
  });
}

export function createAuditFixtureTask(record, serial, bizType, reviewStatus = 'PENDING') {
  return {
    id: 990001 + serial, workOrderId: Number(record.id),
    chatImgId: 1000001 + serial, chatImgDubiousId: 1100001 + serial,
    bizType, bizId: bizType === 'WORK_ORDER_FORM' ? record.id : `${record.id}-HUMAN-50`,
    fieldPath: bizType === 'WORK_ORDER_FORM' ? 'inputParams.screenshots[0]' : 'attachmentUrl',
    submitStage: record.isSubmitted === 1 ? 'SUBMITTED' : 'NOT_SUBMITTED', reviewStatus,
    currentHandler: record.currentHandler, reviewer: reviewStatus === 'PENDING' ? '' : '演示客服甲',
    reviewerId: reviewStatus === 'PENDING' ? undefined : ACTOR_STAFF_ID,
    reviewTime: reviewStatus === 'PENDING' ? '' : FIXTURE_NOW,
    reviewReason: reviewStatus === 'PASS' ? '合成图片审核通过' : reviewStatus === 'REJECT' ? '合成图片不符合演示规则' : '',
    machineRiskDescription: '合成测试风险提示：请人工核实图片内容。',
    restoreResult: reviewStatus === 'PASS' ? 'SUCCESS' : undefined,
    restoreTime: reviewStatus === 'PASS' ? FIXTURE_NOW : undefined,
    createTime: record.createTime, updateTime: record.updateTime,
  };
}

export function createFixtureState() {
  const users = {};
  const histories = {};
  const nodeRelations = {};
  const statusSequence = ['4', '4', '待处理', '处理中', '已完成', '已关闭'];
  const subjects = ['充值后道具未显示', '登录后角色信息异常', '活动奖励领取问题', '游戏画面卡顿反馈', '账号安全验证咨询', '建议增加批量领取功能'];
  const records = Array.from({ length: 60 }, (_, index) => {
    const id = String(910001 + index);
    const number = String(index + 1).padStart(3, '0');
    const game = GAMES[index % GAMES.length];
    const group = GAME_GROUPS.find((item) => Number(item.value) === game.gameGroupId);
    const team = TEAMS[index % TEAMS.length];
    const status = statusSequence[index % statusSequence.length];
    const assigned = index % 6 >= 3;
    const type = WORK_ORDER_TYPES[index % WORK_ORDER_TYPES.length];
    const playerId = `demo-player-${number}`;
    users[playerId] = {
      id: playerId, roleId: `demo-role-${number}`, roleDid: `D${String(700001 + index)}`,
      roleName: `演示玩家${number}`, serverId: String(8801 + index % 4), vipLevel: index % 10,
      gameId: Number(game.value), gameAppId: 'demo-app', channelId: 'demo-channel', channelName: '演示渠道',
      createTime: fixtureDate(index, 8), ip: `192.0.2.${1 + index}`, language: index % 3 === 0 ? 'en' : 'zh_cn',
      gameName: group.label, sdkOpenId: `demo-openid-${number}`, serverName: game.serverName,
      deviceId: `demo-device-${number}`, maxLvl: 10 + index, lastLoginAddress: '测试区域', lastLoginTime: fixtureDate(index, 9),
    };
    histories[`${id}:AI`] = createChatMessages(id, 'AI');
    histories[`${id}:HUMAN`] = createChatMessages(id, 'HUMAN');
    nodeRelations[id] = index % 3 === 0 ? [{
      id: 920001 + index, workOrderId: id, systemWorkOrderId: 930001 + index,
      nodeId: 940001 + index, nodeName: '演示问题核实节点', commentId: 950001 + index,
      requirementMessage: '<p>请核实本次合成测试问题，并补充处理结论。</p>',
      processStatus: index % 2, creator: '演示流程专员', createTime: fixtureDate(index, 10),
      nodeReplies: [{ id: 960001 + index, replyContent: '<p>已收到演示留言，正在进行本地测试核实。</p>', creator: '演示客服乙', createTime: fixtureDate(index, 11) }],
    }] : [];
    return {
      id, title: index === 0 ? '演示反馈：充值后道具未显示，重新登录后仍未到账，请协助核实订单和发放记录' : `${subjects[index % subjects.length]}（演示 ${number}）`,
      summary: `本记录为第 ${index + 1} 条合成测试反馈，供还原界面和验证交互使用。`,
      isAnonymous: index % 4 === 0 ? 1 : 0,
      nodeRelationIds: nodeRelations[id].map((item) => String(item.id)),
      relatedWorkOrderIds: index === 0 ? [910002] : index % 10 === 0 ? [910002 + index, 910003 + index] : index % 10 === 1 ? [910001 + index - 1] : [],
      workOrderType: type.name, workOrderTypeId: type.id,
      playerId, playerName: users[playerId].roleName, roleId: users[playerId].roleId, roleDid: users[playerId].roleDid,
      thirdPartyTicketId: index % 3 === 0 ? String(930001 + index) : '',
      gameGroupId: game.gameGroupId, gameId: Number(game.value), gameName: group.label,
      serverName: game.serverName, vipLevel: users[playerId].vipLevel,
      status, currentHandler: assigned ? STAFF[index % 2].customerName : '', handlerId: assigned ? STAFF[index % 2].staffId : null,
      workOrderTeamId: team.id, workOrderTeamName: team.name,
      createTime: fixtureDate(index, 8), updateTime: fixtureDate(index, 11), claimTime: assigned ? fixtureDate(index, 9) : null,
      finishedTime: ['已完成', '已关闭'].includes(status) ? fixtureDate(index, 11) : null,
      isSubmitted: index % 3 === 0 ? 1 : 0, systemCompleted: status === '已完成' ? 1 : 0,
      systemFinishStatus: status === '已完成' ? 'COMPLETED' : status === '已关闭' ? 'CLOSED' : null,
      systemFinishReason: status === '已完成' ? '演示流程已核实完成' : null,
      unreplied: index % 3 === 0, hasChatSensitiveImage: index % 5 === 0, hasWorkOrderSensitiveImage: index % 7 === 0,
      canClaim: !assigned && ['4', '待处理'].includes(status), inputParams: createInputParams(index),
      canManualInviteEvaluation: false, evaluationStatus: status === '已完成' ? 'EVALUATED' : null,
      evaluationInviteType: status === '已完成' ? 'AUTO' : null, evaluated: status === '已完成',
      satisfactionScore: status === '已完成' ? 5 : null, resolutionStatus: status === '已完成' ? 1 : null,
      evaluationRemark: status === '已完成' ? '演示评价：问题已解决' : '',
    };
  });
  const auditTasks = [], auditLogs = {}, auditImages = {};
  let auditSerial = 0;
  for (const record of records) {
    const kinds = [];
    if (record.hasWorkOrderSensitiveImage) kinds.push('WORK_ORDER_FORM');
    if (record.hasChatSensitiveImage) kinds.push('WORK_ORDER_REPLY');
    for (const kind of kinds) {
      const task = createAuditFixtureTask(record, auditSerial, kind, ['PENDING', 'PASS', 'REJECT'][auditSerial % 3]);
      auditSerial += 1;
      auditTasks.push(task);
      auditImages[task.chatImgId] = SYNTHETIC_IMAGE;
      auditImages[task.chatImgDubiousId] = SYNTHETIC_IMAGE;
      auditLogs[task.id] = [{ id: 1200000 + auditSerial, taskId: task.id, chatImgId: task.chatImgId, chatImgDubiousId: task.chatImgDubiousId, action: 'CREATE', operatorId: ACTOR_STAFF_ID, operatorType: 'ADMIN', remark: '创建合成图片审核任务', afterSnapshot: JSON.stringify(task), createTime: task.createTime }];
    }
  }
  return { records, users, histories, nodeRelations, staff: structuredClone(STAFF), auditTasks, auditLogs, auditImages, auditSerial, auditLogSerial: auditSerial };
}
