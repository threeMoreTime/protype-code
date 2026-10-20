const clock = '2026-10-16T08:00:00.000Z';
const yesterday = '2026-10-15T08:00:00.000Z';
const tinyImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZ1kAAAAASUVORK5CYII=';
const locales = ['zh_cn', 'zh_tw', 'en', 'ja', 'ko', 'fr', 'ru', 'th', 'vi', 'ms', 'id', 'ar', 'es', 'pt', 'it', 'de', 'tr'];

const orderFields = () => [
  { key: 'orderId', labelKey: 'field.orderId', type: 'text', required: true, minLength: 4, maxLength: 40 },
  { key: 'roleName', labelKey: 'field.roleName', type: 'text', required: true },
  { key: 'amount', labelKey: 'field.amount', type: 'number', required: true, min: 1, max: 99999 },
  { key: 'paidAt', labelKey: 'field.paidAt', type: 'datetime', required: true },
  { key: 'screenshot', labelKey: 'field.screenshot', type: 'image', required: false }
];

function workflowDefinition() {
  return {
    nodes: [
      { id: 'start', type: 'START', name: '提交', nameKey: 'action.submit', next: ['check'], parameters: [] },
      { id: 'check', type: 'AUDIT', name: '核查', nameKey: 'action.approve', roleIds: ['processor'], next: ['route'], parameters: [{ key: 'orderId', type: 'STRING', required: true }] },
      { id: 'route', type: 'CONDITION_SPLIT', name: '条件', nameKey: 'field.rules', mode: 'AND', conditions: [{ left: 'amount', operator: 'GE', right: 100 }], next: ['parallel', 'notify'] },
      { id: 'parallel', type: 'PARALLEL_SPLIT', name: '并行', nameKey: 'field.workflow', branches: [['robot'], ['notify']], next: ['robot', 'notify'] },
      { id: 'robot', type: 'ROBOT', name: '订单查询', nameKey: 'action.test', robotId: 'robot-001', robotVersion: 1, next: ['final'], inputMappings: { orderId: '$form.orderId' } },
      { id: 'notify', type: 'CC', name: '抄送', nameKey: 'field.userIds', userIds: ['agent-01'], next: ['final'] },
      { id: 'final', type: 'AUDIT', name: '办结', nameKey: 'action.complete', roleIds: ['processor'], next: [] }
    ],
    edges: [
      ['start', 'check'], ['check', 'route'], ['route', 'parallel'], ['route', 'notify'],
      ['parallel', 'robot'], ['parallel', 'notify'], ['robot', 'final'], ['notify', 'final']
    ].map(([from, to]) => ({ from, to }))
  };
}

export function createBusinessSeed() {
  const actors = [
    { id: 'consumer-01', name: '演示玩家', roles: ['consumer'], teamIds: [] },
    { id: 'agent-01', name: '林悦', roles: ['agent'], teamIds: ['team-cs'] },
    { id: 'supervisor-01', name: '周宁', roles: ['supervisor', 'agent'], teamIds: ['team-cs'] },
    { id: 'processor-01', name: '陈晨', roles: ['processor'], teamIds: ['team-ops'] },
    { id: 'team-admin-01', name: '方明', roles: ['team-admin', 'processor'], teamIds: ['team-ops'] },
    { id: 'admin-01', name: '演示管理员', roles: ['admin'], teamIds: ['team-cs', 'team-ops'] }
  ];
  const formData = { orderId: 'DEMO-ORDER-1001', roleName: '星海旅人', amount: 128, paidAt: '2026-10-16T06:20:00.000Z', screenshot: 'file-001' };
  const feedbackRecord = (id, status, extra = {}) => ({
    id, title: '游戏充值未到账', titleKey: 'demo.payment.title',
    description: '充值成功后代币仍未到账，请协助核查。', descriptionKey: 'demo.payment.description',
    consumerId: 'consumer-01', gameId: 'game-001', typeId: 'feedback-type-payment', language: 'zh_cn',
    status, assigneeId: null, teamId: 'team-cs', workflowTicketId: null, relatedFeedbackId: null,
    formData: { ...formData, orderId: `DEMO-ORDER-${id.slice(-3)}` }, completionRequest: null,
    completionData: null, evaluationId: null, unreadCount: 0, createdAt: clock, updatedAt: clock, ...extra
  });
  const ticket = (id, status, extra = {}) => ({
    id, title: '游戏充值未到账', titleKey: 'demo.payment.title',
    description: '充值成功后代币仍未到账，请协助核查。', descriptionKey: 'demo.payment.description',
    templateId: 'workflow-template-cs', teamId: 'team-ops', creatorId: 'agent-01', assigneeId: 'processor-01',
    status, feedbackId: null, urgent: false, parameters: { ...formData }, nodeParameters: { check: { orderId: formData.orderId } },
    currentNodeId: status === 'robot_failed' ? 'robot' : 'check', round: 1,
    history: [{ id: `history-${id}-1`, event: 'created', actorId: 'agent-01', at: yesterday, round: 1 }],
    comments: [], createdAt: yesterday, updatedAt: clock, dueAt: '2026-10-17T08:00:00.000Z', ...extra
  });
  const completionFields = [
    { key: 'orderId', labelKey: 'field.orderId', type: 'text', required: true },
    { key: 'screenshot', labelKey: 'field.screenshot', type: 'image', required: true },
    { key: 'remark', labelKey: 'field.remark', type: 'textarea', required: false }
  ];
  const collections = {
    applications: [
      { id: 'application-001', name: '充值订单巡检', nameKey: 'demo.template.name', type: 'workflow', projectId: 'project-001', runCount: 3, tokenUsage: 240, inputs: { orderId: { type: 'STRING', required: true }, attachment: { type: 'FILE', required: false } }, tasks: [{ id: 'task-001', name: '每日订单巡检', enabled: true, schedule: { frequency: 'daily', time: '09:00', timezone: 'Asia/Shanghai' }, inputs: { orderId: 'DEMO-ORDER-1001', attachment: 'file-001' } }] },
      { id: 'application-002', name: '离线回答演示', type: 'ai', projectId: 'project-001', runCount: 1, tokenUsage: 320, inputs: { question: { type: 'STRING', required: true } }, tasks: [{ id: 'task-002', name: '一次演示', enabled: true, schedule: { frequency: 'once', at: '2026-10-17T01:00:00.000Z' }, inputs: { question: '充值后代币未到账怎么办？' } }] }
    ],
    runs: [
      { id: 'run-001', applicationId: 'application-001', taskId: 'task-001', name: '订单巡检进行中', status: 'running', startedAt: clock, finishedAt: null, inputs: { orderId: 'DEMO-ORDER-1001' }, result: null, error: null, offlineDemo: true },
      { id: 'run-002', applicationId: 'application-001', taskId: 'task-001', name: '订单巡检失败', status: 'failed', startedAt: yesterday, finishedAt: yesterday, inputs: { orderId: 'DEMO-ORDER-0999' }, result: null, error: 'DEMO_REMOTE_FAILURE', offlineDemo: true },
      { id: 'run-003', applicationId: 'application-002', taskId: 'task-002', name: '离线回答已完成', status: 'succeeded', startedAt: yesterday, finishedAt: yesterday, inputs: { question: '代币到账' }, result: { answerKey: 'demo.faq.payment.content', matchedKnowledgeId: 'knowledge-001', tokenUsage: 320 }, error: null, offlineDemo: true }
    ],
    workflowTickets: [
      ticket('workflow-002', 'processing', { feedbackId: 'feedback-002' }),
      ticket('workflow-003', 'processing', { feedbackId: 'feedback-003', currentNodeId: 'check' }),
      ticket('workflow-004', 'completed', { feedbackId: 'feedback-004', currentNodeId: null }),
      ticket('workflow-005', 'completed', { feedbackId: 'feedback-005', currentNodeId: null }),
      ticket('workflow-006', 'rejected', { templateId: 'workflow-template-normal', creatorId: 'processor-01', assigneeId: null, history: [{ id: 'history-wf006-1', event: 'created', actorId: 'processor-01', at: yesterday, round: 1 }, { id: 'history-wf006-2', event: 'rejected', actorId: 'team-admin-01', reason: 'DEMO_MISSING_MATERIAL', at: clock, round: 1 }] }),
      ticket('workflow-007', 'robot_failed', { feedbackId: 'feedback-007', robotError: { robotId: 'robot-001', code: 'DEMO_REMOTE_FAILURE', recoverable: true } }),
      ticket('workflow-008', 'pending', { templateId: 'workflow-template-vip', creatorId: 'processor-01', assigneeId: null, urgent: true })
    ],
    workflowTasks: [
      { id: 'workflow-task-002', workflowTicketId: 'workflow-002', actorId: 'processor-01', nodeId: 'check', status: 'claimed', isRead: true, round: 1 },
      { id: 'workflow-task-003', workflowTicketId: 'workflow-003', actorId: 'processor-01', nodeId: 'check', status: 'pending', isRead: false, round: 1 },
      { id: 'workflow-task-004', workflowTicketId: 'workflow-004', actorId: 'processor-01', nodeId: 'final', status: 'processed', isRead: true, round: 1 },
      { id: 'workflow-task-005', workflowTicketId: 'workflow-005', actorId: 'processor-01', nodeId: 'final', status: 'processed', isRead: true, round: 1 },
      { id: 'workflow-task-006', workflowTicketId: 'workflow-006', actorId: 'team-admin-01', nodeId: 'check', status: 'processed', isRead: true, round: 1 },
      { id: 'workflow-task-007', workflowTicketId: 'workflow-007', actorId: 'processor-01', nodeId: 'robot', status: 'pending', isRead: false, round: 1 },
      { id: 'workflow-task-008', workflowTicketId: 'workflow-008', actorId: 'processor-01', nodeId: 'check', status: 'pending', isRead: false, round: 1 }
    ],
    workflowTemplates: [
      { id: 'workflow-template-cs', name: '充值到账核查', nameKey: 'demo.template.name', type: 'customer_service', status: 'published', enabled: true, version: 1, formSchema: { fields: orderFields() }, workflow: workflowDefinition(), teamIds: ['team-ops'], roleMappings: { check: ['processor'], final: ['processor'] }, translations: {} },
      { id: 'workflow-template-normal', name: '普通核查申请', type: 'normal', status: 'published', enabled: true, version: 1, formSchema: { fields: orderFields() }, workflow: workflowDefinition(), teamIds: ['team-ops'], roleMappings: { check: ['processor'], final: ['processor'] }, translations: {} },
      { id: 'workflow-template-vip', name: 'VIP核查申请', type: 'vip', status: 'published', enabled: true, version: 1, formSchema: { fields: orderFields() }, workflow: workflowDefinition(), teamIds: ['team-ops'], roleMappings: { check: ['processor'], final: ['processor'] }, translations: {} }
    ],
    cardTemplates: [{ id: 'card-template-order', name: '补充订单材料', nameKey: 'demo.card.name', enabled: true, fields: completionFields, description: '订单号、截图与说明', translations: {} }],
    teams: [
      { id: 'team-cs', name: '客服支持组', enabled: true, adminIds: ['supervisor-01', 'admin-01'], roles: [{ id: 'agent', name: '客服' }, { id: 'supervisor', name: '主管' }], members: [{ userId: 'agent-01', roleId: 'agent', enabled: true }, { userId: 'supervisor-01', roleId: 'supervisor', enabled: true }], templateIds: [], roleMappings: {}, robotFallback: {}, autoClaim: true },
      { id: 'team-ops', name: '充值处理组', enabled: true, adminIds: ['team-admin-01', 'admin-01'], roles: [{ id: 'processor', name: '处理人' }, { id: 'team-admin', name: '团队管理员' }], members: [{ userId: 'processor-01', roleId: 'processor', enabled: true }, { userId: 'team-admin-01', roleId: 'team-admin', enabled: true }], templateIds: ['workflow-template-cs', 'workflow-template-normal', 'workflow-template-vip'], roleMappings: { check: { teamRoleIds: ['processor'] }, final: { teamRoleIds: ['processor'] } }, robotFallback: { robot: { userIds: ['processor-01'] } }, autoClaim: true }
    ],
    robots: [{ id: 'robot-001', name: '离线订单核查机器人', type: 'api', status: 'published', version: 1, inputs: [{ key: 'orderId', type: 'STRING', required: true }], outputs: [{ key: 'paid', type: 'BOOLEAN' }, { key: 'amount', type: 'NUMBER', precision: 2 }], request: { method: 'POST', url: 'https://demo.invalid/check-order', mapping: { order_id: '$input.orderId' }, response: { paid: '$.paid', amount: '$.amount' }, offlineDemo: true }, auth: { type: 'none', offlineOnly: true }, signature: { enabled: false, algorithm: 'DEMO_ONLY', fields: [] }, draft: null, testFingerprint: null, publishedFingerprint: null, versions: [{ version: 1, publishedAt: yesterday, snapshot: { type: 'api', offlineDemo: true } }] }],
    schedules: [{ id: 'schedule-001', name: '充值处理组日班', teamId: 'team-ops', enabled: true, autoClaim: true, view: 'week', startDate: '2026-10-12', endDate: '2026-10-18', shifts: [{ id: 'shift-001', userId: 'processor-01', date: '2026-10-16', startTime: '09:00', endTime: '18:00', timezone: 'Asia/Shanghai' }, { id: 'shift-002', userId: 'team-admin-01', date: '2026-10-16', startTime: '09:00', endTime: '18:00', timezone: 'Asia/Shanghai' }] }],
    users: actors.map(actor => ({ id: actor.id, name: actor.name, title: actor.roles[0], contactAlias: `demo-${actor.id}`, organizationId: 'org-001', roles: [...actor.roles], teamIds: [...actor.teamIds], enabled: true })),
    roles: [
      { id: 'role-admin', name: '管理员', code: 'admin', enabled: true, dataScope: 'all', permissions: ['*'], userIds: ['admin-01'] },
      { id: 'role-agent', name: '客服', code: 'agent', enabled: true, dataScope: 'team', permissions: ['feedback.*'], userIds: ['agent-01', 'supervisor-01'] },
      { id: 'role-processor', name: '工单处理人', code: 'processor', enabled: true, dataScope: 'team', permissions: ['workflow.*'], userIds: ['processor-01', 'team-admin-01'] }
    ],
    projects: [{ id: 'project-001', name: '客户支持演示项目', description: '仅使用虚构连接描述和本地演示响应', database: { provider: 'demo', database: 'support-demo', offlineOnly: true }, dify: { applicationAlias: 'demo-answer', mode: 'offline-fixture' }, enabled: true }],
    feedback: [
      feedbackRecord('feedback-001', 'pending'),
      feedbackRecord('feedback-002', 'processing', { assigneeId: 'agent-01', workflowTicketId: 'workflow-002', unreadCount: 1 }),
      feedbackRecord('feedback-003', 'waiting_completion', { assigneeId: 'agent-01', workflowTicketId: 'workflow-003', completionRequest: { id: 'card-001', cardTemplateId: 'card-template-order', status: 'pending', fields: completionFields } }),
      feedbackRecord('feedback-004', 'completed', { assigneeId: 'agent-01', workflowTicketId: 'workflow-004', evaluationId: 'evaluation-001' }),
      feedbackRecord('feedback-005', 'completed', { assigneeId: 'agent-01', workflowTicketId: 'workflow-005', evaluationId: 'evaluation-002', createdAt: yesterday }),
      feedbackRecord('feedback-006', 'pending', { relatedFeedbackId: 'feedback-004' }),
      feedbackRecord('feedback-007', 'processing', { assigneeId: 'agent-01', workflowTicketId: 'workflow-007' }),
      feedbackRecord('feedback-008', 'completed', { assigneeId: 'agent-01', evaluationId: 'evaluation-003' })
    ],
    feedbackTypes: [
      { id: 'feedback-type-payment', name: '充值到账核查', nameKey: 'demo.template.name', enabled: true, anonymous: false, workflowTemplateId: 'workflow-template-cs', formSchema: { fields: orderFields() }, translations: {}, description: '游戏充值未到账', descriptionKey: 'demo.payment.title' },
      { id: 'feedback-type-safety', name: '账号安全核查', enabled: true, anonymous: true, workflowTemplateId: 'workflow-template-cs', formSchema: { fields: [{ key: 'description', labelKey: 'field.description', type: 'textarea', required: true }, { key: 'screenshot', labelKey: 'field.screenshot', type: 'image', required: false }] }, translations: {}, description: '识别与反馈诈骗风险', ticketType: 1001 }
    ],
    assignmentRules: [{ id: 'assignment-001', name: '充值问题中文接单', staffGroupId: 'staff-group-001', typeId: 'feedback-type-payment', gameId: 'game-001', language: 'zh_cn', assigneeIds: ['agent-01'], priority: 10, enabled: true }],
    imageAudits: [{ id: 'image-audit-001', name: '订单截图审核', fileId: 'file-001', sourceType: 'feedback_form', sourceId: 'feedback-001', status: 'pending', reason: '', history: [] }],
    quickReplyGroups: [{ id: 'quick-group-001', name: '充值问题', sortOrder: 1 }],
    quickReplies: [{ id: 'quick-reply-001', name: '补充订单信息', groupId: 'quick-group-001', content: '已收到您的反馈，正在核查订单。请补充订单截图与角色信息。', contentKey: 'demo.reply.content', pinned: true, translations: {} }],
    announcements: [{ id: 'announcement-001', title: '充值服务维护公告', titleKey: 'demo.announcement.title', summary: '演示充值到账延迟及反馈指引', summaryKey: 'demo.announcement.summary', content: '演示环境将于今日进行充值链路维护。期间如遇到账延迟，请提交订单截图，我们会保留处理进度。', contentKey: 'demo.announcement.content', cover: tinyImage, status: 'published', enabled: true, gameIds: ['game-001'], tags: ['DEMO'], translations: {}, publishedAt: yesterday, expiresAt: '2026-11-16T08:00:00.000Z' }],
    evaluations: [
      { id: 'evaluation-001', feedbackId: 'feedback-004', consumerId: 'consumer-01', gameId: 'game-001', scale: 5, score: null, resolved: null, tagIds: [], comment: '', status: 'pending', expiresAt: '2026-10-18T08:00:00.000Z', createdAt: clock, titleKey: 'demo.evaluation.title', contentKey: 'demo.evaluation.content' },
      { id: 'evaluation-002', feedbackId: 'feedback-005', consumerId: 'consumer-01', gameId: 'game-001', scale: 5, score: null, resolved: null, tagIds: [], comment: '', status: 'expired', expiresAt: '2026-10-15T08:00:00.000Z', createdAt: '2026-10-14T08:00:00.000Z', titleKey: 'demo.evaluation.title', contentKey: 'demo.evaluation.content' },
      { id: 'evaluation-003', feedbackId: 'feedback-008', consumerId: 'consumer-01', gameId: 'game-001', scale: 5, score: 2, resolved: false, tagIds: ['evaluation-tag-001'], comment: 'DEMO: slow reply', status: 'submitted', expiresAt: '2026-10-18T08:00:00.000Z', createdAt: yesterday, submittedAt: clock }
    ],
    evaluationConfigs: [{ id: 'evaluation-config-001', name: '默认邀评', gameId: 'game-001', title: '请评价本次处理', titleKey: 'demo.evaluation.title', content: '本次问题是否得到解决？请给出1至5星评价。', contentKey: 'demo.evaluation.content', delayMinutes: 0, expiryHours: 48, tagIds: ['evaluation-tag-001'], enabled: true, translations: {} }],
    evaluationTags: [{ id: 'evaluation-tag-001', name: '回复不及时', nameKey: 'demo.tag.name', enabled: true, translations: {} }],
    complaints: [{ id: 'complaint-001', consumerId: 'consumer-01', gameId: 'game-001', content: 'DEMO: service delay history', createdAt: yesterday }],
    knowledgeCategories: [{ id: 'knowledge-category-root', name: '游戏帮助', parentId: null, sortOrder: 1, translations: {} }, { id: 'knowledge-category-payment', name: '充值与代币', parentId: 'knowledge-category-root', sortOrder: 1, translations: {} }, { id: 'knowledge-category-safety', name: '安全提示', parentId: 'knowledge-category-root', sortOrder: 2, translations: {} }],
    knowledge: [
      { id: 'knowledge-001', title: '充值后代币未到账怎么办？', titleKey: 'demo.faq.payment.title', content: '请确认游戏角色与订单，等待五分钟后刷新代币流水。如仍未到账，请提交反馈并附上订单截图。', contentKey: 'demo.faq.payment.content', categoryId: 'knowledge-category-payment', gameId: 'game-001', enabled: true, views: 128, helpfulCount: 16, relatedIds: ['knowledge-002'], translations: {} },
      { id: 'knowledge-002', title: '如何识别冒充客服的诈骗？', titleKey: 'demo.faq.safety.title', content: '官方客服不会索要密码或验证码。请勿向私人账户转账，并通过本页提交反馈。', contentKey: 'demo.faq.safety.content', categoryId: 'knowledge-category-safety', gameId: 'game-001', enabled: true, views: 86, helpfulCount: 12, relatedIds: ['knowledge-001'], translations: {} }
    ],
    staffSnapshots: [{ id: 'staff-snapshot-001', staffId: 'staff-001', date: '2026-10-15', completedCount: 2, replyCount: 4, averageScore: 4.5, onlineMinutes: 480 }],
    suspendRules: [{ id: 'suspend-rule-001', name: '待消费者补充暂停计时', timeoutMinutes: 1440, statusIds: ['waiting_completion'], enabled: true }],
    sessions: [
      { id: 'session-001', consumerId: 'consumer-01', gameId: 'game-001', language: 'zh_cn', status: 'active', agentId: null, scenario: 'success', additionalInfo: { roleName: '星海旅人' }, createdAt: clock, requestState: 'idle', historyCursor: null },
      { id: 'session-002', consumerId: 'consumer-01', gameId: 'game-001', language: 'en', status: 'ended', agentId: 'agent-01', scenario: 'success', additionalInfo: {}, createdAt: yesterday, requestState: 'idle', historyCursor: null }
    ],
    staff: [{ id: 'staff-001', name: '林悦', userId: 'agent-01', groupId: 'staff-group-001', availability: 'online', enabled: true, translations: {} }, { id: 'staff-002', name: '周宁', userId: 'supervisor-01', groupId: 'staff-group-001', availability: 'busy', enabled: true, translations: {} }],
    staffGroups: [{ id: 'staff-group-001', name: '充值客服组', staffIds: ['staff-001', 'staff-002'], gameIds: ['game-001'] }],
    staffStatus: [{ id: 'staff-status-001', staffId: 'staff-001', status: 'online', startedAt: '2026-10-16T01:00:00.000Z', endedAt: null }, { id: 'staff-status-002', staffId: 'staff-002', status: 'busy', startedAt: '2026-10-16T06:00:00.000Z', endedAt: null }],
    organizations: [{ id: 'org-001', name: '演示服务中心', parentId: null, sortOrder: 1, enabled: true }],
    menus: [{ id: 'menu-feedback', name: '反馈列表', parentId: null, component: 'business/feedback-list', permission: 'feedback.read', icon: 'inbox', enabled: true, sortOrder: 1 }, { id: 'menu-feedback-reply', name: '反馈回复', parentId: 'menu-feedback', component: 'business/feedback-detail', permission: 'feedback.reply', icon: 'message', enabled: true, sortOrder: 1 }],
    games: [{ id: 'game-001', name: '星海冒险', nameKey: 'demo.game.name', icon: tinyImage, aiAvatar: tinyImage, regions: ['CN', 'US', 'JP'], languages: [...locales], knowledgeCategoryId: 'knowledge-category-root', welcomeMessageId: 'welcome-001', feedbackTypeIds: ['feedback-type-payment', 'feedback-type-safety'], workflowTemplateIds: ['workflow-template-cs'], teamIds: ['team-cs', 'team-ops'], dailyTicketLimit: 10, packageIds: ['package-001'], switches: { aiEnabled: true, feedbackEnabled: true, sensitiveCheck: true, unreadBadge: true, pushMessages: true, manualTransfer: false, chatImageSend: false, complaintEntry: false }, enabled: true }],
    welcomeMessages: [{ id: 'welcome-001', name: '默认欢迎语', content: '您好，我是离线演示助手。您可以查询充值问题、查看代币流水或提交反馈。', contentKey: 'demo.welcome.content', language: 'zh_cn', gameId: 'game-001', staffId: 'staff-001', rules: { channel: 'all', returningConsumer: true }, translations: {} }],
    consumers: [{ id: 'consumer-01', name: '演示玩家', gameId: 'game-001', roleName: '星海旅人', region: 'CN', channel: 'demo-web', language: 'zh_cn', createdAt: yesterday }],
    systemSettings: [{ id: 'system-settings-001', name: '客服 H5 离线包', h5Version: '1.0.0-demo', bundleName: 'h5-offline-demo', updatedAt: clock, offlineOnly: true }],
    packages: [{ id: 'package-001', name: '演示客户端资源包', packageVersion: '1.0.0-demo', description: '离线元数据，不执行真实推送', enabled: true, metadata: { platform: 'all', delivery: 'offline-demo', fileId: 'file-002' } }],
    aiThresholds: [{ id: 'ai-threshold-001', name: '演示 AI 规则', retrievalThreshold: 0.65, polishThreshold: 0.8 }],
    files: [{ id: 'file-001', name: 'demo-order.png', mime: 'image/png', size: 68, data: tinyImage, previewEnabled: true, storageId: 'storage-001', createdAt: clock }, { id: 'file-002', name: 'demo-package.txt', mime: 'text/plain', size: 12, data: 'data:text/plain;base64,T2ZmbGluZSBkZW1v', previewEnabled: true, storageId: 'storage-001', createdAt: clock }],
    storage: [{ id: 'storage-001', name: '本地演示存储', provider: 'local-demo', description: '小型 data URI 随演示数据保存恢复', bucket: 'demo-only', endpoint: 'local://business-suite', enabled: true, offlineOnly: true }],
    alertRules: [{ id: 'alert-rule-001', name: '待处理反馈提醒', metric: 'pendingFeedback', windowMinutes: 60, comparison: 'GE', threshold: 2, cooldownMinutes: 30, notificationGroup: 'DEMO-SUPPORT', languages: ['zh_cn', 'en'], gameIds: ['game-001'], typeIds: ['feedback-type-payment'], enabled: true, lastResult: null }],
    messages: [
      { id: 'message-001', sessionId: 'session-001', feedbackId: null, senderId: 'consumer-01', senderType: 'consumer', content: '游戏充值未到账', contentKey: 'demo.payment.title', fileIds: [], actions: [], isRead: true, retracted: false, createdAt: clock },
      { id: 'message-002', sessionId: 'session-001', feedbackId: null, senderId: 'ai-demo', senderType: 'ai', content: '请确认游戏角色与订单，等待五分钟后刷新代币流水。如仍未到账，请提交反馈并附上订单截图。', contentKey: 'demo.faq.payment.content', fileIds: [], actions: [{ type: 'FAQ', knowledgeId: 'knowledge-001' }, { type: 'NAVIGATE', moduleId: 'cs-h5.token-records' }, { type: 'SEND_MESSAGE', textKey: 'demo.payment.title' }, { type: 'OPEN_URL', url: 'https://example.invalid/offline-demo', offlineDemo: true }], isRead: true, retracted: false, createdAt: clock },
      { id: 'message-003', sessionId: null, feedbackId: 'feedback-002', senderId: 'agent-01', senderType: 'agent', content: '已收到您的反馈，正在核查订单。请补充订单截图与角色信息。', contentKey: 'demo.reply.content', fileIds: [], actions: [], isRead: false, retracted: false, createdAt: clock },
      { id: 'message-004', sessionId: null, feedbackId: 'feedback-004', senderId: 'agent-01', senderType: 'agent', content: '已核实订单并补发代币，请查看游戏代币流水。', contentKey: 'demo.complete.content', fileIds: [], actions: [], isRead: true, retracted: false, createdAt: clock }
    ],
    cards: [{ id: 'card-001', feedbackId: 'feedback-003', cardTemplateId: 'card-template-order', status: 'pending', fields: completionFields, data: null, createdAt: clock }],
    chatEvaluations: [{ id: 'chat-evaluation-001', sessionId: 'session-002', consumerId: 'consumer-01', scale: 3, score: 3, comment: '', createdAt: yesterday }],
    tokenRecords: [{ id: 'token-record-001', consumerId: 'consumer-01', gameId: 'game-001', roleName: '星海旅人', item: 'DEMO_RECHARGE', amount: 1280, balance: 1800, createdAt: '2026-10-15T07:00:00.000Z' }, { id: 'token-record-002', consumerId: 'consumer-01', gameId: 'game-001', roleName: '星海旅人', item: 'DEMO_PURCHASE', amount: -200, balance: 1600, createdAt: '2026-10-16T07:00:00.000Z' }]
  };
  for (const records of Object.values(collections)) {
    for (const record of records) record.version ??= 1;
  }
  const localizedContent = {
    'application-002': { nameKey: 'demo.application.ai.name' },
    'run-001': { nameKey: 'demo.run.running.name' },
    'run-002': { nameKey: 'demo.run.failed.name' },
    'run-003': { nameKey: 'demo.run.succeeded.name' },
    'workflow-template-normal': { nameKey: 'demo.template.normal.name' },
    'workflow-template-vip': { nameKey: 'demo.template.vip.name' },
    'card-template-order': { descriptionKey: 'demo.card.description' },
    'team-cs': { nameKey: 'demo.team.cs.name' },
    'team-ops': { nameKey: 'demo.team.ops.name' },
    'robot-001': { nameKey: 'demo.robot.name' },
    'schedule-001': { nameKey: 'demo.schedule.name' },
    'role-admin': { nameKey: 'value.admin' },
    'role-agent': { nameKey: 'value.agent' },
    'role-processor': { nameKey: 'value.processor' },
    'project-001': { nameKey: 'demo.project.name', descriptionKey: 'demo.project.description' },
    'feedback-type-safety': { nameKey: 'demo.type.safety.name', descriptionKey: 'demo.type.safety.description' },
    'assignment-001': { nameKey: 'demo.assignment.name' },
    'image-audit-001': { nameKey: 'demo.audit.name' },
    'quick-group-001': { nameKey: 'demo.quickGroup.name' },
    'quick-reply-001': { nameKey: 'demo.quickReply.name' },
    'evaluation-config-001': { nameKey: 'demo.evaluationConfig.name' },
    'knowledge-category-root': { nameKey: 'demo.category.root.name' },
    'knowledge-category-payment': { nameKey: 'demo.category.payment.name' },
    'knowledge-category-safety': { nameKey: 'demo.category.safety.name' },
    'suspend-rule-001': { nameKey: 'demo.suspend.name' },
    'staff-group-001': { nameKey: 'demo.staffGroup.name' },
    'org-001': { nameKey: 'demo.organization.name' },
    'menu-feedback': { nameKey: 'module.cs-admin.feedback-list' },
    'menu-feedback-reply': { nameKey: 'action.reply' },
    'welcome-001': { nameKey: 'demo.welcome.name' },
    'system-settings-001': { nameKey: 'demo.system.name' },
    'package-001': { nameKey: 'demo.package.name', descriptionKey: 'demo.package.description' },
    'ai-threshold-001': { nameKey: 'demo.aiThreshold.name' },
    'storage-001': { nameKey: 'demo.storage.name', descriptionKey: 'demo.storage.description' },
    'alert-rule-001': { nameKey: 'demo.alert.name' }
  };
  for (const records of Object.values(collections)) {
    for (const record of records) Object.assign(record, localizedContent[record.id] || {});
  }
  collections.applications[0].tasks[0].nameKey = 'demo.task.daily.name';
  collections.applications[1].tasks[0].nameKey = 'demo.task.once.name';
  for (const team of collections.teams) {
    for (const role of team.roles) role.nameKey = `value.${role.id}`;
  }
  return { schemaVersion: 'business-suite-data/1', revision: 0, clock, actors, collections, timeline: [], operations: [], nextSequence: 100 };
}
