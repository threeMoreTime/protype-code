const field = (key, type = 'text', required = false, extra = {}) => ({ key, labelKey: `field.${key}`, type, required, ...extra });
const select = (key, values, required = true) => field(key, 'select', required, { options: values.map(value => ({ value, labelKey: `value.${value}` })) });
const json = (key, required = false) => field(key, 'json', required);
const relation = (key, collection, required = true) => field(key, 'text', required, { relation: collection });
const name = field('name', 'text', true);
const enabled = field('enabled', 'checkbox');
const translations = json('translations');
const status = values => select('status', values);
const action = (id, command, scope = 'record', fields, collection) => ({
  id, labelKey: `action.${id}`, command, scope,
  ...(fields ? { fields, requiresInput: fields.length > 0 } : {}),
  ...(collection ? { collection } : {})
});
const edit = action('edit', 'record.update', 'record', undefined);
const remove = action('delete', 'record.delete');
const create = action('create', 'record.create', 'module');
const toggle = action('toggle', 'record.toggle');
const view = action('view', 'record.view');
const refresh = action('refresh', 'query.refresh', 'module');
const exportData = action('export', 'record.export', 'module');
const crud = [create, edit, remove];
const manage = [...crud, toggle];

const fields = {
  applications: [name, select('type', ['workflow', 'ai']), relation('projectId', 'projects'), field('runCount', 'number'), field('tokenUsage', 'number'), json('inputs'), json('tasks')],
  runs: [relation('applicationId', 'applications'), name, status(['pending', 'running', 'succeeded', 'failed', 'stopped']), field('startedAt', 'datetime'), field('finishedAt', 'datetime'), json('inputs'), json('result'), field('error', 'textarea')],
  workflowTickets: [field('title', 'text', true), field('description', 'textarea', true), relation('templateId', 'workflowTemplates'), relation('teamId', 'teams'), relation('creatorId', 'users'), relation('assigneeId', 'users', false), status(['pending', 'processing', 'rejected', 'completed', 'closed', 'robot_failed']), relation('feedbackId', 'feedback', false), field('urgent', 'checkbox'), json('parameters'), json('nodeParameters'), json('comments'), json('history'), field('round', 'number', true, { min: 1 }), field('createdAt', 'datetime'), field('dueAt', 'datetime')],
  workflowTasks: [relation('workflowTicketId', 'workflowTickets'), relation('actorId', 'users'), field('nodeId', 'text', true), status(['pending', 'claimed', 'processed', 'ignored']), field('isRead', 'checkbox')],
  workflowTemplates: [name, select('type', ['normal', 'vip', 'customer_service']), status(['draft', 'published', 'disabled']), enabled, field('version', 'number', true, { min: 1 }), json('formSchema', true), json('workflow', true), json('teamIds', true), json('roleMappings', true), translations],
  cardTemplates: [name, enabled, json('fields', true), translations, field('description', 'textarea')],
  teams: [name, enabled, json('adminIds', true), json('roles', true), json('members', true), json('templateIds'), json('roleMappings'), json('robotFallback'), field('autoClaim', 'checkbox')],
  robots: [name, select('type', ['api', 'ai']), status(['draft', 'published', 'disabled']), field('version', 'number', true, { min: 1 }), json('inputs', true), json('outputs', true), json('request', true), json('auth', true), json('signature', true), json('draft'), json('testFingerprint'), field('publishedFingerprint'), json('versions')],
  schedules: [name, relation('teamId', 'teams'), enabled, field('autoClaim', 'checkbox'), select('view', ['week', 'month']), field('startDate', 'date', true), field('endDate', 'date', true), json('shifts', true)],
  users: [name, field('title'), field('contactAlias'), relation('organizationId', 'organizations'), json('roles', true), json('teamIds'), enabled],
  roles: [name, field('code', 'text', true), enabled, select('dataScope', ['self', 'team', 'organization', 'organization-and-children', 'custom', 'all']), json('organizationIds'), json('permissions', true), json('userIds')],
  projects: [name, field('description', 'textarea'), json('database', true), json('dify', true), enabled],
  feedback: [field('title', 'text', true), field('description', 'textarea', true), relation('consumerId', 'consumers'), relation('gameId', 'games'), relation('typeId', 'feedbackTypes'), select('language', ['zh_cn', 'zh_tw', 'en', 'ja', 'ko', 'fr', 'ru', 'th', 'vi', 'ms', 'id', 'ar', 'es', 'pt', 'it', 'de', 'tr']), status(['pending', 'processing', 'waiting_completion', 'completed']), relation('assigneeId', 'users', false), relation('teamId', 'teams', false), relation('workflowTicketId', 'workflowTickets', false), relation('relatedFeedbackId', 'feedback', false), json('formData'), json('completionRequest'), json('completionData'), relation('evaluationId', 'evaluations', false), field('unreadCount', 'number'), field('createdAt', 'datetime')],
  feedbackTypes: [name, enabled, field('anonymous', 'checkbox'), relation('workflowTemplateId', 'workflowTemplates'), json('formSchema', true), translations, field('description', 'textarea')],
  assignmentRules: [name, relation('staffGroupId', 'staffGroups'), relation('typeId', 'feedbackTypes'), relation('gameId', 'games'), field('language', 'text', true), json('assigneeIds', true), field('priority', 'number', true, { min: 0 }), enabled],
  imageAudits: [name, relation('fileId', 'files'), select('sourceType', ['feedback_reply', 'feedback_form', 'completion_card']), field('sourceId', 'text', true), status(['pending', 'approved', 'rejected']), field('reason', 'textarea'), json('history')],
  quickReplyGroups: [name, field('sortOrder', 'number', true, { min: 0 })],
  quickReplies: [name, relation('groupId', 'quickReplyGroups'), field('content', 'textarea', true), field('pinned', 'checkbox'), translations],
  announcements: [field('title', 'text', true), field('summary', 'textarea'), field('content', 'textarea', true), field('cover', 'image'), status(['draft', 'published', 'disabled']), enabled, json('gameIds', true), json('tags'), translations, field('publishedAt', 'datetime'), field('expiresAt', 'datetime')],
  evaluations: [relation('feedbackId', 'feedback'), relation('consumerId', 'consumers'), field('score', 'number', false, { min: 1, max: 5 }), field('resolved', 'checkbox'), json('tagIds'), field('comment', 'textarea'), status(['pending', 'submitted', 'expired']), field('expiresAt', 'datetime'), field('createdAt', 'datetime')],
  evaluationConfigs: [name, relation('gameId', 'games'), field('title', 'text', true), field('content', 'textarea', true), field('delayMinutes', 'number', true, { min: 0 }), field('expiryHours', 'number', true, { min: 1 }), json('tagIds'), enabled, translations],
  evaluationTags: [name, enabled, translations],
  complaints: [relation('consumerId', 'consumers'), relation('gameId', 'games'), field('content', 'textarea'), field('createdAt', 'datetime')],
  knowledgeCategories: [name, relation('parentId', 'knowledgeCategories', false), field('sortOrder', 'number', true, { min: 0 }), translations],
  knowledge: [field('title', 'text', true), field('content', 'textarea', true), relation('categoryId', 'knowledgeCategories'), relation('gameId', 'games'), enabled, field('views', 'number'), field('helpfulCount', 'number'), json('relatedIds'), translations],
  staffSnapshots: [relation('staffId', 'staff'), field('date', 'date'), field('completedCount', 'number'), field('replyCount', 'number'), field('averageScore', 'number'), field('onlineMinutes', 'number')],
  suspendRules: [name, field('timeoutMinutes', 'number', true, { min: 1 }), json('statusIds', true), enabled],
  sessions: [relation('consumerId', 'consumers'), relation('gameId', 'games'), field('language'), status(['active', 'ended', 'failed']), relation('agentId', 'users', false), field('scenario'), json('additionalInfo'), field('createdAt', 'datetime')],
  staff: [name, relation('userId', 'users'), relation('groupId', 'staffGroups'), select('availability', ['online', 'busy', 'offline']), enabled, translations],
  staffGroups: [name, json('staffIds'), json('gameIds')],
  staffStatus: [relation('staffId', 'staff'), select('status', ['online', 'busy', 'offline']), field('startedAt', 'datetime'), field('endedAt', 'datetime')],
  organizations: [name, relation('parentId', 'organizations', false), field('sortOrder', 'number', true, { min: 0 }), enabled],
  menus: [name, relation('parentId', 'menus', false), field('component', 'text', true), field('permission', 'text', true), field('icon'), enabled, field('sortOrder', 'number', true, { min: 0 })],
  games: [name, field('icon', 'image'), field('aiAvatar', 'image'), json('regions', true), json('languages', true), relation('knowledgeCategoryId', 'knowledgeCategories'), relation('welcomeMessageId', 'welcomeMessages'), json('feedbackTypeIds', true), json('workflowTemplateIds', true), json('teamIds', true), field('dailyTicketLimit', 'number', true, { min: 0 }), json('packageIds'), json('switches', true), enabled],
  welcomeMessages: [name, field('content', 'textarea', true), field('language', 'text', true), relation('gameId', 'games'), relation('staffId', 'staff', false), json('rules', true), translations],
  consumers: [name, relation('gameId', 'games'), field('roleName'), field('region'), field('channel'), field('language'), field('createdAt', 'datetime')],
  systemSettings: [name, field('h5Version', 'text', true), field('bundleName', 'text', true), field('updatedAt', 'datetime'), field('offlineOnly', 'checkbox', true)],
  packages: [name, field('packageVersion', 'text', true), field('description', 'textarea'), enabled, json('metadata')],
  aiThresholds: [name, field('retrievalThreshold', 'number', true, { min: 0, max: 1 }), field('polishThreshold', 'number', true, { min: 0, max: 1 })],
  files: [name, field('mime', 'text', true), field('size', 'number', true, { min: 0 }), field('data', 'image', true), field('previewEnabled', 'checkbox'), relation('storageId', 'storage'), field('createdAt', 'datetime')],
  storage: [name, select('provider', ['local-demo', 's3-demo']), field('description', 'textarea'), field('bucket', 'text', true), field('endpoint', 'text', true), enabled, field('offlineOnly', 'checkbox', true)],
  alertRules: [name, select('metric', ['pendingFeedback', 'workflowFailures', 'replyDelay']), field('windowMinutes', 'number', true, { min: 1, max: 1440 }), select('comparison', ['GT', 'GE']), field('threshold', 'number', true, { min: 0 }), field('cooldownMinutes', 'number', true, { min: 0 }), field('notificationGroup', 'text', true), json('languages'), json('gameIds'), json('typeIds'), enabled, json('lastResult')],
  messages: [relation('sessionId', 'sessions', false), relation('feedbackId', 'feedback', false), field('senderId', 'text', true), select('senderType', ['consumer', 'agent', 'ai', 'system']), field('content', 'textarea', true), json('fileIds'), json('actions'), field('isRead', 'checkbox'), field('retracted', 'checkbox'), field('createdAt', 'datetime')],
  cards: [relation('feedbackId', 'feedback'), relation('cardTemplateId', 'cardTemplates'), status(['pending', 'submitted', 'unknown']), json('fields', true), json('data'), field('createdAt', 'datetime')],
  chatEvaluations: [relation('sessionId', 'sessions'), relation('consumerId', 'consumers'), field('score', 'number', true, { min: 1, max: 3 }), field('comment', 'textarea'), field('createdAt', 'datetime')],
  tokenRecords: [relation('consumerId', 'consumers'), relation('gameId', 'games'), field('roleName'), field('item'), field('amount', 'number'), field('balance', 'number'), field('createdAt', 'datetime')]
};

const configurationCollections = new Set(['workflowTemplates', 'cardTemplates', 'teams', 'robots', 'schedules', 'users', 'roles', 'projects', 'feedbackTypes', 'assignmentRules', 'quickReplyGroups', 'quickReplies', 'announcements', 'evaluationConfigs', 'evaluationTags', 'knowledgeCategories', 'knowledge', 'suspendRules', 'staff', 'staffGroups', 'organizations', 'menus', 'games', 'welcomeMessages', 'systemSettings', 'packages', 'aiThresholds', 'storage', 'alertRules']);
const collections = Object.fromEntries(Object.entries(fields).map(([id, recordFields]) => [id, {
  fields: recordFields,
  editable: configurationCollections.has(id),
  roles: ['admin', 'supervisor', ...(id === 'teams' || id === 'schedules' ? ['team-admin'] : [])]
}]));

const feedbackCreateFields = fields.feedback.filter(item => ['title', 'description', 'typeId', 'gameId', 'language', 'formData', 'relatedFeedbackId'].includes(item.key));
const workflowCreateFields = fields.workflowTickets.filter(item => ['title', 'description', 'templateId', 'teamId', 'parameters', 'urgent'].includes(item.key));
const assignFields = [relation('assigneeId', 'users')];
const replyFields = [field('content', 'textarea', true), json('fileIds')];
const contentFields = [field('content', 'textarea', true)];
const feedbackActions = [
  view, action('claim', 'feedback.claim'), action('assign', 'feedback.assign', 'record', assignFields),
  action('reply', 'feedback.reply', 'record', replyFields), action('transfer', 'feedback.transfer', 'record', assignFields),
  action('escalate', 'feedback.escalate', 'record', [relation('templateId', 'workflowTemplates'), relation('teamId', 'teams')]),
  action('requestCompletion', 'feedback.request-completion', 'record', [relation('cardTemplateId', 'cardTemplates')]),
  action('complete', 'feedback.complete'), action('inviteEvaluation', 'feedback.invite'),
  action('retractReply', 'feedback.retract', 'record', [relation('messageId', 'messages')])
];
const workflowActions = [
  view, action('create', 'workflow.create', 'module', workflowCreateFields),
  action('editRejected', 'workflow.edit', 'record', workflowCreateFields), action('resubmit', 'workflow.resubmit'),
  action('claim', 'workflow.claim'), action('ignore', 'workflow.ignore'),
  action('approve', 'workflow.approve', 'record', [field('comment', 'textarea'), relation('nextAssigneeId', 'users', false)]),
  action('reject', 'workflow.reject', 'record', [field('reason', 'textarea', true)]), action('close', 'workflow.close', 'record', [field('reason', 'textarea', true)]),
  action('transfer', 'workflow.transfer', 'record', assignFields), action('urgent', 'workflow.urgent'),
  action('comment', 'workflow.comment', 'record', [...contentFields, json('mentionIds'), relation('replyTo', 'messages', false)]),
  action('read', 'workflow.read'), action('syncCustomer', 'workflow.sync'),
  action('requestCompletion', 'workflow.request-info', 'record', [relation('cardTemplateId', 'cardTemplates')]), action('recoverRobot', 'workflow.recover')
];

const definitions = [
  ['workflow.apps', 'applications', 'table', [view, action('createTask', 'task.create', 'record', [name, json('schedule', true), json('inputs')]), action('editTask', 'task.update', 'record', [field('taskId', 'text', true), name, json('schedule', true), json('inputs')]), action('deleteTask', 'task.delete', 'record', [field('taskId', 'text', true)]), action('run', 'task.run')]],
  ['workflow.runs', 'runs', 'table', [view, action('restart', 'run.restart'), action('stop', 'run.stop')]],
  ['workflow.monitor', 'runs', 'dashboard', [refresh], true],
  ['workflow.dashboard', 'workflowTickets', 'dashboard', [refresh], true],
  ['workflow.my-tickets', 'workflowTickets', 'workflow', workflowActions],
  ['workflow.team-tickets', 'workflowTickets', 'workflow', [view, action('assign', 'workflow.assign', 'record', assignFields), action('recoverRobot', 'workflow.recover'), exportData]],
  ['workflow.ticket-list', 'workflowTickets', 'table', [view, exportData], true],
  ['workflow.ticket-templates', 'workflowTemplates', 'table', [...manage, action('duplicate', 'record.duplicate'), action('publish', 'template.publish')]],
  ['workflow.card-templates', 'cardTemplates', 'table', [...manage, action('translate', 'config.translate')]],
  ['workflow.teams', 'teams', 'table', manage],
  ['workflow.robots', 'robots', 'table', [create, edit, view, action('test', 'robot.test'), action('publish', 'robot.publish'), action('discardDraft', 'robot.discard'), action('import', 'robot.import', 'module', [json('records', true)]), action('export', 'robot.export')]],
  ['workflow.schedules', 'schedules', 'table', [...manage, action('import', 'schedule.import', 'module', [relation('teamId', 'teams'), field('startDate', 'date', true), field('endDate', 'date', true), json('shifts', true)]), exportData]],
  ['workflow.users', 'users', 'table', manage],
  ['workflow.roles', 'roles', 'table', crud],
  ['workflow.projects', 'projects', 'table', crud],
  ['cs-admin.feedback-list', 'feedback', 'feedback', [...feedbackActions, action('batchReply', 'feedback.batch-reply', 'module', [json('feedbackIds', true), ...replyFields]), action('relate', 'feedback.relate', 'record', [relation('relatedFeedbackId', 'feedback')])]],
  ['cs-admin.my-tasks', 'feedback', 'feedback', feedbackActions],
  ['cs-admin.feedback-config', 'feedbackTypes', 'table', [...crud, action('translate', 'config.translate'), action('preview', 'record.view'), action('describe', 'config.describe')]],
  ['cs-admin.assignment-rules', 'assignmentRules', 'table', crud],
  ['cs-admin.image-audit', 'imageAudits', 'table', [view, action('approve', 'audit.approve'), action('reject', 'audit.reject', 'record', [field('reason', 'textarea', true)]), action('backfill', 'audit.backfill', 'module', fields.imageAudits.filter(item => item.key !== 'history')), action('delete', 'audit.delete')]],
  ['cs-admin.quick-replies', 'quickReplies', 'table', [...crud, action('pin', 'record.pin'), action('translate', 'config.translate'), action('createGroup', 'record.create', 'module', fields.quickReplyGroups, 'quickReplyGroups'), action('editGroup', 'record.update', 'module', [relation('id', 'quickReplyGroups'), ...fields.quickReplyGroups], 'quickReplyGroups'), action('deleteGroup', 'record.delete', 'module', [relation('id', 'quickReplyGroups')], 'quickReplyGroups')]],
  ['cs-admin.announcements', 'announcements', 'table', [...manage, view, action('publish', 'config.publish')]],
  ['cs-admin.evaluation-results', 'evaluations', 'table', [view, refresh], true],
  ['cs-admin.evaluation-config', 'evaluationConfigs', 'table', [...crud, action('translate', 'config.translate'), action('createTag', 'record.create', 'module', fields.evaluationTags, 'evaluationTags'), action('editTag', 'record.update', 'module', [relation('id', 'evaluationTags'), ...fields.evaluationTags], 'evaluationTags'), action('deleteTag', 'record.delete', 'module', [relation('id', 'evaluationTags')], 'evaluationTags')]],
  ['cs-admin.complaints', 'complaints', 'table', [view, refresh], true],
  ['cs-admin.knowledge', 'knowledge', 'table', [...manage, action('translate', 'config.translate'), action('import', 'record.import', 'module', [json('records', true)]), action('createCategory', 'record.create', 'module', fields.knowledgeCategories, 'knowledgeCategories'), action('editCategory', 'record.update', 'module', [relation('id', 'knowledgeCategories'), ...fields.knowledgeCategories], 'knowledgeCategories'), action('deleteCategory', 'record.delete', 'module', [relation('id', 'knowledgeCategories')], 'knowledgeCategories')]],
  ['cs-admin.ai-statistics', 'sessions', 'dashboard', [refresh], true],
  ['cs-admin.staff-performance', 'staffSnapshots', 'dashboard', [refresh, view, action('recalculate', 'stat.recalculate', 'module', [field('date', 'date', true)]), action('createSuspendRule', 'record.create', 'module', fields.suspendRules, 'suspendRules'), action('editSuspendRule', 'record.update', 'module', [relation('id', 'suspendRules'), ...fields.suspendRules], 'suspendRules'), action('deleteSuspendRule', 'record.delete', 'module', [relation('id', 'suspendRules')], 'suspendRules')]],
  ['cs-admin.reception-simulation', 'sessions', 'chat', [action('connect', 'chat.connect', 'module', [relation('gameId', 'games'), field('language', 'text', true), select('device', ['desktop', 'mobile']), json('additionalInfo'), field('scenario')]), action('disconnect', 'chat.reset')]],
  ['cs-admin.users', 'users', 'table', [edit, remove, toggle]],
  ['cs-admin.roles', 'roles', 'table', [...manage, exportData, action('authorizeUsers', 'role.authorize', 'record', [json('userIds', true)]), action('revokeUsers', 'role.revoke', 'record', [json('userIds', true)])]],
  ['cs-admin.organizations', 'organizations', 'table', crud],
  ['cs-admin.menus', 'menus', 'table', [...crud, action('cascadeDelete', 'menu.cascade-delete')]],
  ['cs-admin.staff', 'staff', 'table', [...manage, action('batchConfigure', 'staff.batch-configure', 'module', [json('staffIds', true), translations]), action('createGroup', 'record.create', 'module', fields.staffGroups, 'staffGroups'), action('editGroup', 'record.update', 'module', [relation('id', 'staffGroups'), ...fields.staffGroups], 'staffGroups'), action('deleteGroup', 'record.delete', 'module', [relation('id', 'staffGroups')], 'staffGroups')]],
  ['cs-admin.staff-status', 'staffStatus', 'table', [view, refresh], true],
  ['cs-admin.games', 'games', 'table', crud],
  ['cs-admin.welcome-messages', 'welcomeMessages', 'table', crud],
  ['cs-admin.players', 'consumers', 'table', [view, action('history', 'consumer.history'), action('translate', 'consumer.translate')], true],
  ['cs-admin.system-settings', 'systemSettings', 'settings', [action('updateVersion', 'system.update-version', 'record', fields.systemSettings.filter(item => ['h5Version', 'bundleName'].includes(item.key)))]],
  ['cs-admin.package-push', 'packages', 'table', manage],
  ['cs-admin.ai-thresholds', 'aiThresholds', 'settings', [edit]],
  ['cs-admin.files', 'files', 'table', [view, action('upload', 'file.add', 'module', fields.files.filter(item => ['name', 'mime', 'data', 'storageId'].includes(item.key))), action('download', 'file.download'), action('delete', 'file.delete'), action('batchDelete', 'file.batch-delete', 'module', [json('fileIds', true)]), action('togglePreview', 'file.toggle-preview')]],
  ['cs-admin.storage', 'storage', 'table', manage],
  ['cs-admin.alert-rules', 'alertRules', 'table', [...manage, action('trigger', 'alert.trigger')]],
  ['cs-h5.faq', 'knowledge', 'faq', [view, refresh], true],
  ['cs-h5.faq-detail', 'knowledge', 'detail', [view, action('helpful', 'knowledge.helpful'), action('unresolved', 'knowledge.unresolved')], true],
  ['cs-h5.chat', 'sessions', 'chat', [action('connect', 'chat.connect', 'module', [relation('gameId', 'games'), field('language')]), action('send', 'chat.send', 'record', contentFields), action('retry', 'chat.retry'), action('reset', 'chat.reset'), action('evaluateChat', 'chat.evaluate', 'record', [field('score', 'number', true, { min: 1, max: 3 }), field('comment', 'textarea')])]],
  ['cs-h5.submit-feedback', 'feedback', 'form', [action('submit', 'feedback.create', 'module', feedbackCreateFields)]],
  ['cs-h5.my-feedback', 'feedback', 'feedback', [view, refresh], true],
  ['cs-h5.feedback-detail', 'feedback', 'feedback', [view, action('reply', 'feedback.reply', 'record', replyFields), action('submitCompletion', 'feedback.submit-completion', 'record', [json('completionData', true)]), action('relatedFeedback', 'feedback.related', 'record', feedbackCreateFields)]],
  ['cs-h5.feedback-evaluation', 'evaluations', 'form', [view, action('submitEvaluation', 'evaluation.submit', 'record', [field('score', 'number', true, { min: 1, max: 5 }), field('resolved', 'checkbox', true), json('tagIds'), field('comment', 'textarea')])]],
  ['cs-h5.token-records', 'tokenRecords', 'table', [view, refresh], true],
  ['cs-h5.announcement-detail', 'announcements', 'detail', [view], true]
];

const filters = {
  'workflow.monitor': ['projectId', 'startedAt', 'status'],
  'workflow.dashboard': ['teamId', 'assigneeId', 'templateId', 'createdAt'],
  'workflow.my-tickets': ['status', 'templateId', 'teamId'],
  'workflow.team-tickets': ['teamId', 'status', 'assigneeId'],
  'cs-admin.ai-statistics': ['gameId', 'language', 'createdAt'],
  'cs-admin.staff-performance': ['staffId', 'date'],
  'cs-h5.token-records': ['consumerId', 'createdAt']
};

// Facts are copied from the authorized source inventory; the application has no dependency on private reports.
const facts = {
  "workflow.apps": {
    "features": [
      "查询、搜索、应用类型、运行次数与 Token 用量展示",
      "应用任务调度子模块：任务新增、编辑、删除、动态输入与上传",
      "一次、每日、每周和每月调度",
      "未观察到应用新增功能"
    ],
    "source": [
      {
        "path": "src/pages/appManage/app/index.tsx",
        "lines": [
          56
        ]
      },
      {
        "path": "src/type/task.ts",
        "lines": [
          2
        ]
      },
      {
        "path": "src/service/taskService.ts",
        "lines": [
          13
        ]
      }
    ]
  },
  "workflow.runs": {
    "features": [
      "按应用、状态与日期查询运行",
      "结果查看",
      "按运行状态允许重启或停止"
    ],
    "source": [
      {
        "path": "src/pages/appManage/workflowRun/index.tsx",
        "lines": [
          232,
          244,
          267
        ]
      }
    ]
  },
  "workflow.monitor": {
    "features": [
      "总览、次数趋势、状态分布、应用类型与应用趋势",
      "按时间和项目筛选及单图刷新"
    ],
    "source": [
      {
        "path": "src/pages/appManage/monitor/index.tsx",
        "lines": [
          103
        ]
      }
    ]
  },
  "workflow.dashboard": {
    "features": [
      "部门、团队、人员、模板和日期筛选",
      "新增、已办、待办、关闭、完成率及平均和最长时效",
      "人员排名、工单趋势、类型占比与模板使用",
      "下钻工单",
      "源码明确暂不展示类型汇总和导出入口，不将服务方法视为已接入"
    ],
    "source": [
      {
        "path": "src/pages/ticket/dashboard/index.tsx",
        "lines": [
          8,
          110,
          259,
          290
        ]
      },
      {
        "path": "src/pages/ticket/dashboard/chartConfigs.ts",
        "lines": [
          11
        ]
      }
    ]
  },
  "workflow.my-tickets": {
    "features": [
      "ALL、PENDING、PROCESSED、CREATED、CC 个人视角",
      "普通和 VIP 模板提单、快速提单及拒绝后非客服工单编辑",
      "详情流程、参与者节点参数、评论、提及、回复和已读",
      "同步客服及补全卡片",
      "认领、忽略、通过、拒绝、关闭、下一节点指定、同级转接和加急",
      "机器人异常恢复；个人任务状态与整单状态分离",
      "客服类型不能在该入口新建"
    ],
    "source": [
      {
        "path": "src/pages/ticket/myTickets/index.tsx",
        "lines": [
          304
        ]
      },
      {
        "path": "src/pages/ticket/myTickets/type.ts",
        "lines": [
          329
        ]
      },
      {
        "path": "src/shared/ticket/createPolicy.ts",
        "lines": [
          7
        ]
      },
      {
        "path": "src/mobile/components/MobileTicketDetail/index.tsx",
        "lines": [
          773,
          1207
        ]
      }
    ]
  },
  "workflow.team-tickets": {
    "features": [
      "TEAM 范围查询和详情",
      "权限允许时分配",
      "导出及机器人异常入口",
      "实际入口包装 myTickets/TeamTickets，不是孤立页面"
    ],
    "source": [
      {
        "path": "src/pages/ticket/teamTickets/index.tsx",
        "lines": [
          3
        ]
      },
      {
        "path": "src/pages/ticket/myTickets/TeamTickets.tsx",
        "lines": [
          100,
          148,
          379
        ]
      }
    ]
  },
  "workflow.ticket-list": {
    "features": [
      "ALL 范围工单筛选及按 ID 深链接",
      "已读和权限、结束状态限制的单个与批量导出",
      "详情 showActions=false，为只读详情"
    ],
    "source": [
      {
        "path": "src/pages/ticket/ticketList/index.tsx",
        "lines": [
          156,
          224,
          548,
          556
        ]
      }
    ]
  },
  "workflow.ticket-templates": {
    "features": [
      "查询、新建、编辑、启停、删除和关联团队",
      "复制模板来源及基础信息",
      "DynamicForm 拖拽、WorkflowEditor 流程编辑",
      "START、AUDIT、CC、ROBOT、CONDITION_SPLIT、PARALLEL_SPLIT 节点",
      "AND/OR 条件、节点参数、引用和机器人版本校验后发布"
    ],
    "source": [
      {
        "path": "src/pages/ticket/ticketTemplate/index.tsx",
        "lines": [
          15
        ]
      },
      {
        "path": "src/pages/ticket/ticketTemplate/TemplateForm.tsx",
        "lines": [
          2,
          667,
          772,
          1032
        ]
      },
      {
        "path": "src/pages/ticket/ticketTemplate/materials.tsx",
        "lines": [
          297
        ]
      }
    ]
  },
  "workflow.card-templates": {
    "features": [
      "新增、查询、编辑、删除和启停",
      "补全字段拖拽编排、多语言及两步编辑",
      "翻译失败保留原有值并保存"
    ],
    "source": [
      {
        "path": "src/pages/ticket/cardTemplate/index.tsx",
        "lines": [
          14
        ]
      },
      {
        "path": "src/pages/ticket/cardTemplate/TemplateEditor.tsx",
        "lines": [
          380,
          549,
          648,
          716
        ]
      }
    ]
  },
  "workflow.teams": {
    "features": [
      "团队新增、编辑、删除",
      "管理员、角色、成员与启停、成员唯一角色",
      "模板关联、解绑、节点角色映射和机器人兜底",
      "桌面 V2 nodeKey、teamRoleIds、robotFallback 与移动 stepOrder、ROLE/USER 契约不同，不能宣称完全等价"
    ],
    "source": [
      {
        "path": "src/pages/ticket/team/TeamForm.tsx",
        "lines": [
          36
        ]
      },
      {
        "path": "src/pages/ticket/team/TeamTemplateAssociation.tsx",
        "lines": [
          329,
          620
        ]
      }
    ]
  },
  "workflow.robots": {
    "features": [
      "AI/API 机器人查询、新建与详情",
      "输入输出结构、请求映射、认证及签名配置",
      "保存与丢弃草稿、接口测试和执行指纹一致后发布",
      "版本历史快照、JSON 导入导出及数值精度保护",
      "离线只使用明确演示的 HTTP、AI 与签名执行结果"
    ],
    "source": [
      {
        "path": "src/pages/ticket/robotCenter/components/RobotList.tsx",
        "lines": [
          237
        ]
      },
      {
        "path": "src/pages/ticket/robotCenter/components/RobotEditor.tsx",
        "lines": [
          144,
          594,
          638,
          705,
          758,
          858,
          912
        ]
      },
      {
        "path": "src/pages/ticket/robotCenter/components/RobotDetailDrawer.tsx",
        "lines": [
          171
        ]
      }
    ]
  },
  "workflow.schedules": {
    "features": [
      "团队、调度状态与自动认领",
      "日历班次新增、编辑、删除及周月视图",
      "模板下载、范围导入覆盖与部分失败刷新"
    ],
    "source": [
      {
        "path": "src/pages/ticket/schedule/index.tsx",
        "lines": [
          13
        ]
      },
      {
        "path": "src/service/scheduleService.ts",
        "lines": [
          68,
          119,
          139,
          184,
          196
        ]
      }
    ]
  },
  "workflow.users": {
    "features": [
      "用户新增、查询、编辑、删除和启停",
      "用户角色、职称与通讯标识"
    ],
    "source": [
      {
        "path": "src/pages/system/user/index.tsx",
        "lines": [
          41
        ]
      }
    ]
  },
  "workflow.roles": {
    "features": [
      "角色新增、查询、编辑和删除",
      "权限树读取与配置",
      "保存后清理权限缓存"
    ],
    "source": [
      {
        "path": "src/pages/system/role/index.tsx",
        "lines": [
          124
        ]
      },
      {
        "path": "src/config/permissions.ts",
        "lines": [
          8,
          15
        ]
      }
    ]
  },
  "workflow.projects": {
    "features": [
      "项目新增、查询、编辑和删除",
      "数据库与 Dify 连接配置",
      "项目上下文用于应用和任务",
      "离线仅保留虚构连接描述，不执行真实试连或复用真实凭据"
    ],
    "source": [
      {
        "path": "src/pages/system/project/index.tsx",
        "lines": [
          129
        ]
      }
    ]
  },
  "cs-admin.feedback-list": {
    "features": [
      "查询、筛选、分页和详情",
      "关联反馈、认领、分配和批量回复",
      "依赖游戏、团队、反馈状态与类型配置"
    ],
    "source": [
      {
        "path": "src/pages/workOrder/workOrderList/index.tsx",
        "lines": [
          306
        ]
      }
    ]
  },
  "cs-admin.my-tasks": {
    "features": [
      "待办、已办与未回复红点",
      "处理、转接、沟通和回复撤回",
      "升级工作流、节点留言同步、完成和邀评"
    ],
    "source": [
      {
        "path": "src/pages/workOrder/myWorkOrder/index.tsx",
        "lines": [
          259
        ]
      }
    ]
  },
  "cs-admin.feedback-config": {
    "features": [
      "类型模板列表、动态字段表单和删除",
      "多语言名称、表单翻译和匿名开放设置",
      "关联工作流模板、生成模板描述和双端预览"
    ],
    "source": [
      {
        "path": "src/pages/workOrder/workOrderConfig/index.tsx",
        "lines": [
          100
        ]
      }
    ]
  },
  "cs-admin.assignment-rules": {
    "features": [
      "按客服组、问题类型、语言和游戏查询",
      "规则新增、编辑和删除"
    ],
    "source": [
      {
        "path": "src/pages/workOrder/assignRules/index.tsx",
        "lines": [
          79
        ]
      }
    ]
  },
  "cs-admin.image-audit": {
    "features": [
      "审核任务、图片预览与日志",
      "通过、拒绝、历史补录、硬删除及回写结果",
      "来源覆盖反馈回复、表单及补全卡片",
      "权限常量和页面权限属性有注释；前端权限完整性未验证"
    ],
    "source": [
      {
        "path": "src/pages/workOrder/imageAudit/index.tsx",
        "lines": [
          304,
          357,
          482,
          532,
          561,
          591,
          635
        ]
      }
    ]
  },
  "cs-admin.quick-replies": {
    "features": [
      "分组新增、编辑和删除",
      "分组内容分页、明细、新增、编辑、删除和置顶",
      "多语言翻译及沟通输入复用"
    ],
    "source": [
      {
        "path": "src/pages/workOrder/fastReply/index.tsx",
        "lines": [
          97
        ]
      }
    ]
  },
  "cs-admin.announcements": {
    "features": [
      "查询、详情、草稿、发布和编辑",
      "启用、停用、删除、游戏范围与标签",
      "H5 双端预览"
    ],
    "source": [
      {
        "path": "src/pages/workOrder/announcement/index.tsx",
        "lines": [
          45
        ]
      }
    ]
  },
  "cs-admin.evaluation-results": {
    "features": [
      "按游戏、日期、分数及解决状态查询评价",
      "只读结果列表"
    ],
    "source": [
      {
        "path": "src/pages/workOrder/serviceEvaluation/results/index.tsx",
        "lines": [
          5
        ]
      }
    ]
  },
  "cs-admin.evaluation-config": {
    "features": [
      "游戏邀评规则、多语言内容、延迟与期限",
      "不满意标签新增、编辑、删除和翻译",
      "标签绑定后阻止删除"
    ],
    "source": [
      {
        "path": "src/pages/workOrder/serviceEvaluation/inviteConfig/index.tsx",
        "lines": [
          5
        ]
      }
    ]
  },
  "cs-admin.complaints": {
    "features": [
      "按游戏、消费者等筛选和分页查看",
      "当前入口未含投诉受理、分派或审批动作"
    ],
    "source": [
      {
        "path": "src/pages/complaint/index.tsx",
        "lines": [
          23
        ]
      }
    ]
  },
  "cs-admin.knowledge": {
    "features": [
      "分类树新增、编辑、删除和排序",
      "多语言问答新增、编辑、删除和启停",
      "批量导入、模板下载和翻译"
    ],
    "source": [
      {
        "path": "src/pages/knowledge/aiKnowledge/index.tsx",
        "lines": [
          91,
          118
        ]
      }
    ]
  },
  "cs-admin.ai-statistics": {
    "features": [
      "按日期与游戏范围查看看板和动态图表",
      "分页统计报表查询；未证明存在文件导出"
    ],
    "source": [
      {
        "path": "src/pages/dashboard/aiCustomerStat/index.tsx",
        "lines": [
          141,
          267
        ]
      }
    ]
  },
  "cs-admin.staff-performance": {
    "features": [
      "绩效看板、明细、每日快照和补算",
      "挂起规则新增、编辑、删除和启停",
      "关联客服状态历史、完成、回复和评价数据"
    ],
    "source": [
      {
        "path": "src/pages/dashboard/staffPerformance/index.tsx",
        "lines": [
          58
        ]
      }
    ]
  },
  "cs-admin.reception-simulation": {
    "features": [
      "选择游戏、语言、设备、附加信息及规则",
      "连接、退出客服并显示消费者信息",
      "以 iframe 加载客服 H5；不是移动客服后台"
    ],
    "source": [
      {
        "path": "src/pages/receptionSimulation/index.tsx",
        "lines": [
          80,
          141,
          154,
          233,
          274,
          321,
          389
        ]
      }
    ]
  },
  "cs-admin.users": {
    "features": [
      "主体树过滤与用户查询",
      "编辑、启停和行删除",
      "分配角色；新增和批量删除等注释入口维持停用"
    ],
    "source": [
      {
        "path": "src/pages/system/user/components/userTable.tsx",
        "lines": [
          36
        ]
      }
    ]
  },
  "cs-admin.roles": {
    "features": [
      "角色新增、编辑、删除、启停和导出",
      "菜单权限与数据范围",
      "已分配和未分配用户、授权、取消及批量取消"
    ],
    "source": [
      {
        "path": "src/pages/system/role/hooks/useRoleManagement.ts",
        "lines": [
          43,
          75,
          90,
          96,
          138,
          162
        ]
      }
    ]
  },
  "cs-admin.organizations": {
    "features": [
      "主体树和列表",
      "创建、编辑和删除"
    ],
    "source": [
      {
        "path": "src/pages/system/dept/index.tsx",
        "lines": [
          50
        ]
      }
    ]
  },
  "cs-admin.menus": {
    "features": [
      "菜单树查询",
      "组件路径、权限标识、图标和状态配置",
      "新增、编辑、删除和级联删除"
    ],
    "source": [
      {
        "path": "src/pages/system/menu/index.tsx",
        "lines": [
          62
        ]
      }
    ]
  },
  "cs-admin.staff": {
    "features": [
      "关联用户、客服新增、编辑、删除和启停",
      "昵称多语言与批量配置",
      "客服组新增、编辑和删除"
    ],
    "source": [
      {
        "path": "src/pages/system/staffManage/index.tsx",
        "lines": [
          93
        ]
      }
    ]
  },
  "cs-admin.staff-status": {
    "features": [
      "按客服、客服组、状态和时间查询历史",
      "状态切换位于全局头部，应与同一演示状态流及统计关联"
    ],
    "source": [
      {
        "path": "src/pages/system/staffManage/statusRecord/index.tsx",
        "lines": [
          28
        ]
      }
    ]
  },
  "cs-admin.games": {
    "features": [
      "游戏列表、创建、配置编辑和删除",
      "图标、AI 头像、地区、语言、知识主分类和欢迎语",
      "反馈类型、工作流模板、团队及每日工单上限",
      "包推送关联、敏感检查、红点、消息推送和业务开关",
      "配置字段存在不代表发票或查询等外部能力已实现"
    ],
    "source": [
      {
        "path": "src/pages/system/gameManage/index.tsx",
        "lines": [
          99
        ]
      }
    ]
  },
  "cs-admin.welcome-messages": {
    "features": [
      "查询、新增、编辑和删除",
      "规则、语言、客服及游戏关联"
    ],
    "source": [
      {
        "path": "src/pages/system/gameManage/welcomeConfig/index.tsx",
        "lines": [
          97
        ]
      }
    ]
  },
  "cs-admin.players": {
    "features": [
      "玩家筛选、地区级联及游戏和渠道筛选",
      "聊天记录与翻译",
      "当前未含玩家新增、编辑或删除"
    ],
    "source": [
      {
        "path": "src/pages/system/playerManage/index.tsx",
        "lines": [
          41,
          103
        ]
      }
    ]
  },
  "cs-admin.system-settings": {
    "features": [
      "管理员入口及 H5 离线包版本更新",
      "进入游戏包推送与 AI 阈值配置",
      "离线仅修改本地版本元数据，禁止真实发布"
    ],
    "source": [
      {
        "path": "src/pages/system/config/index.tsx",
        "lines": [
          23,
          50
        ]
      }
    ]
  },
  "cs-admin.package-push": {
    "features": [
      "包配置查询、新增、编辑、删除和启停",
      "游戏关联在游戏管理中维护"
    ],
    "source": [
      {
        "path": "src/pages/system/sdkNotifyConfig/index.tsx",
        "lines": [
          58
        ]
      }
    ]
  },
  "cs-admin.ai-thresholds": {
    "features": [
      "读取和修改知识召回、答案润色阈值（0–1）",
      "修改配置不代表本地已经具备语义检索或大模型"
    ],
    "source": [
      {
        "path": "src/pages/system/aiSimilarityThreshold/index.tsx",
        "lines": [
          86,
          132
        ]
      }
    ]
  },
  "cs-admin.files": {
    "features": [
      "文件及图片上传、查询和下载",
      "单个、批量删除及预览开关",
      "进入存储配置"
    ],
    "source": [
      {
        "path": "src/pages/system/oss/index.tsx",
        "lines": [
          51
        ]
      }
    ]
  },
  "cs-admin.storage": {
    "features": [
      "配置列表、详情、新增、编辑和删除",
      "切换启用状态",
      "仅用虚构配置与本地附件，不读取或复制真实存储凭据"
    ],
    "source": [
      {
        "path": "src/pages/system/oss/ossConfig.tsx",
        "lines": [
          86
        ]
      }
    ]
  },
  "cs-admin.alert-rules": {
    "features": [
      "规则列表与管理页切换；按关键词、监控项和启停状态查询、分页。",
      "规则新增、编辑、删除、启用和停用；权限控制及未保存切换确认。",
      "监控项、语言、游戏组、游戏及反馈类型选项；可按范围配置统计维度。",
      "规则名称、监控项、通知群标识与通知冷却时间配置。",
      "统计窗口 1–1440 分钟、比较关系 GT/GE、非负阈值及实时可读规则预览。",
      "手动触发并展示是否达到条件、是否发送通知、实际值、阈值和说明。",
      "保存失败保留输入；成功回列表并刷新。通知和触发执行在离线场景中均为明确演示响应。"
    ],
    "source": [
      {
        "path": "src/pages/system/alertConfig/index.tsx",
        "lines": [
          372,
          543,
          596,
          645,
          661,
          701,
          880,
          953,
          1056,
          1094
        ]
      },
      {
        "path": "src/pages/system/alertConfig/constants.ts",
        "lines": [
          1,
          3
        ]
      },
      {
        "path": "src/pages/system/alertConfig/services/index.ts",
        "lines": [
          42,
          85,
          96,
          100,
          104,
          108,
          112
        ]
      },
      {
        "path": "src/pages/system/alertConfig/hooks/usePage.ts",
        "lines": [
          111,
          126,
          150,
          155,
          157,
          166
        ]
      },
      {
        "path": "src/pages/system/alertConfig/types/index.ts",
        "lines": [
          16,
          72,
          92,
          94
        ]
      },
      {
        "path": "src/pages/system/alertConfig/columns.tsx",
        "lines": [
          21,
          60,
          87,
          126,
          140
        ]
      }
    ]
  },
  "cs-h5.faq": {
    "features": [
      "子分类、热门问题、关键词 API 分页查询和加载更多",
      "空、错、加载态及中文输入法防抖",
      "客服邮箱、公告轮播、AI 咨询入口及我的反馈未读数",
      "反诈分类 banner 跳到通用提单页并携带 ticketType:1001，不是独立反诈页"
    ],
    "source": [
      {
        "path": "src/pages/FAQ/index.tsx",
        "lines": [
          65,
          89,
          130,
          205,
          221,
          447,
          506,
          560
        ]
      }
    ]
  },
  "cs-h5.faq-detail": {
    "features": [
      "问答正文、阅读统计和相关问题跳转",
      "有用、未解决反馈及确认后建单"
    ],
    "source": [
      {
        "path": "src/pages/FAQDetail/index.tsx",
        "lines": [
          120,
          162,
          182,
          214
        ]
      }
    ]
  },
  "cs-h5.chat": {
    "features": [
      "欢迎语、文本和表情输入及输入合并防抖",
      "AI 可用性与发送、等待、失败、结果不明状态",
      "原请求继续、身份恢复、历史下拉分页、图片和旧消息渲染",
      "相关 FAQ 本地展开、消息动作、AI 建单卡片、退出会话评价和链接预览",
      "当前活动传输为 HTTP V2，不是 WebSocket 人工会话"
    ],
    "source": [
      {
        "path": "src/pages/Chat/index.tsx",
        "lines": [
          137,
          165,
          183,
          202,
          208
        ]
      }
    ]
  },
  "cs-h5.submit-feedback": {
    "features": [
      "独立提单、聊天转单、AI 预填及关联旧反馈重新提单",
      "按用户、角色、游戏与语言加载模板",
      "动态字段、必填与范围校验、图片上传和删除",
      "上传失败确认、回执、结果不明锁和防重复创建",
      "可选聊天卡片关联及会话重置失败处理"
    ],
    "source": [
      {
        "path": "src/pages/SubmitTicket/index.tsx",
        "lines": [
          63,
          112,
          151,
          162
        ]
      }
    ]
  },
  "cs-h5.my-feedback": {
    "features": [
      "反馈列表与全部、待处理、处理中、已完成筛选",
      "详情入口、状态与时间",
      "未读回复、待补全、待评价提醒及完成后关联反馈入口"
    ],
    "source": [
      {
        "path": "src/pages/MyTickets/index.tsx",
        "lines": [
          14,
          65,
          106,
          204,
          228,
          252
        ]
      }
    ]
  },
  "cs-h5.feedback-detail": {
    "features": [
      "反馈号、类型、状态、创建时间及提单字段只读快照",
      "留言与待补全信息 Tab",
      "文字和图片回复、图片预览及增量回复拉取",
      "补全卡片表单、提交和已提交态",
      "评价邀请、完成后禁回帖及关联新反馈"
    ],
    "source": [
      {
        "path": "src/pages/TicketDetail/index.tsx",
        "lines": [
          23,
          85,
          111,
          122,
          153,
          313,
          365,
          399
        ]
      }
    ]
  },
  "cs-h5.feedback-evaluation": {
    "features": [
      "邀请标题、文案、截止时间与 1–5 星评分",
      "解决、未解决、低分不满意标签和备注",
      "提交成功、已评价、过期、不可评价及失败后重查恢复",
      "这是客服反馈评价，不能与聊天会话三档评价合并"
    ],
    "source": [
      {
        "path": "src/pages/TicketEvaluation/index.tsx",
        "lines": [
          90,
          246,
          272,
          285,
          343,
          365,
          374
        ]
      }
    ]
  },
  "cs-h5.token-records": {
    "features": [
      "最近 30 天和角色身份校验",
      "交易时间、变动项目、金额、余额及收入支出颜色",
      "20 条分页、空、加载与查询错误态",
      "仅只读流水，不含充值、扣款或结算写操作"
    ],
    "source": [
      {
        "path": "src/pages/TokenRecords/index.tsx",
        "lines": [
          13,
          30,
          61,
          175,
          201,
          246
        ]
      }
    ]
  },
  "cs-h5.announcement-detail": {
    "features": [
      "公告标题、标签、时间、摘要、封面及净化富文本",
      "不存在、停用、过期和加载失败状态",
      "返回 FAQ 与我知道了；未发现独立已读上报接口"
    ],
    "source": [
      {
        "path": "src/pages/AnnouncementDetail/index.tsx",
        "lines": [
          10,
          27,
          80,
          98,
          139,
          159
        ]
      }
    ]
  }
};

const modules = definitions.map(([id, collection, kind, actions, readonly = false]) => {
  const appId = id.slice(0, id.indexOf('.'));
  const collectionFields = fields[collection];
  const columnKeys = ['name', 'title', 'content', 'status', 'enabled', 'createdAt', 'score', 'amount', 'balance', 'version', 'staffId', 'workflowTicketId', 'applicationId', 'h5Version'];
  const columns = collectionFields.filter(item => columnKeys.includes(item.key)).slice(0, 5).map(item => ({ key: item.key, labelKey: item.labelKey }));
  return {
    id, appId, titleKey: 'module.' + id, kind, collection, readonly,
    columns: columns.length ? columns : collectionFields.slice(0, 4).map(item => ({ key: item.key, labelKey: item.labelKey })),
    fields: collectionFields, actions,
    features: facts[id].features, source: facts[id].source,
    roles: appId === 'cs-h5' ? ['consumer', 'admin'] : appId === 'workflow' ? ['processor', 'team-admin', 'admin'] : ['agent', 'supervisor', 'admin'],
    filters: (filters[id] || []).map(key => collectionFields.find(item => item.key === key) || field(key)),
    devices: ['desktop', 'mobile']
  };
});

export const businessCatalog = {
  schemaVersion: 'business-suite/1',
  apps: ['workflow', 'cs-admin', 'cs-h5'].map(id => ({ id, nameKey: 'app.' + id, moduleIds: modules.filter(module => module.appId === id).map(module => module.id) })),
  modules,
  collections
};
