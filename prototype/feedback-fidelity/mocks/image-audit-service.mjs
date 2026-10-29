import { network } from './network.mjs';

// Exact module replacement: the original source service's image transport and
// authentication code must never be loaded, evaluated or included in the export.
const base = '/workOrder/image/audit';
export const workOrderImageAuditService = Object.freeze({
  getList: (params) => network.Post(`${base}/list`, params),
  getLogs: async (taskId) => (await network.Get(`${base}/logs`, { params: { taskId } })).rows,
  getDubiousImage: async (imageId) => (await network.Get('/upload/chat/upload/dubious/image', { params: { imageId } })).data,
  review: (params) => network.Post(`${base}/review`, params),
  delete: (params) => network.Post(`${base}/delete`, params),
  backfill: async (params) => Number((await network.Post(`${base}/backfill`, params)).data),
});
export default workOrderImageAuditService;
