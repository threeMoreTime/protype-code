// Historical evidence allowlist; never infer these rules for a new project.
export function acceptsAccentEvidence(evidence) {
  return ['.al-search-job-strip progress', '.al-logical-job progress'].includes(evidence?.selector);
}
export function isUnchangedPreset(isLegacy, link, trigger) {
  return isLegacy && link.sceneId === link.targetSceneId && trigger.type === 'ON_CLICK';
}
