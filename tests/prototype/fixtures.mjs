export const minimal = () => ({
  schemaVersion: '1.0', id: 'demo', name: '独立业务', sources: [],
  requirements: [{ id: 'r1', text: '提交申请', evidence: [] }],
  pages: [{ id: 'request', title: '申请', path: '/', requirementIds: [], evidence: [],
    elements: [{ id: 'submit', kind: 'button', label: '提交', requirementIds: ['r1'] }],
    states: [{ id: 'default', kind: 'default', label: '填写' }, { id: 'success', kind: 'success', label: '成功' }],
  }],
  actions: [{ id: 'send', pageId: 'request', elementId: 'submit', fromState: 'default', targetPageId: 'request', targetState: 'success', trigger: 'submit', requirementIds: ['r1'] }],
  flows: [{ id: 'main', name: '申请流程', startPageId: 'request', startState: 'default', actionIds: ['send'] }],
});
export const capture = (id = 'request') => ({ captureVersion: '1.0', id, name: 'Other business', viewport: { width: 390, height: 844 }, root: { id: 'root', tag: 'main', kind: 'element', rect: { x: 0, y: 0, width: 390, height: 844 }, style: {}, children: [] } });
