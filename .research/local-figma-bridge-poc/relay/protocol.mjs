export const LOOPBACK_HOST = "127.0.0.1";
export const DEFAULT_PORT = 41731;
export const FIGMA_PLUGIN_ORIGIN = "https://www.figma.com";
export const WORKSPACE_ID = "protype-code-local";
export const TASK_ID = "local-figma-bridge-poc";
export const COMMANDS = Object.freeze({
  STATUS: "status",
  READ_DOCUMENT: "read_document",
  CREATE_POC: "create_poc",
  CREATE_TEXT: "create_text",
  SET_LAYOUT: "set_layout",
  UPDATE_POC: "update_poc",
  CREATE_PROTOTYPE_SAMPLE: "create_prototype_sample",
  EXPORT_POC: "export_poc",
  DELETE_POC_OWNED: "delete_poc_owned",
  SCOPE_READ_NODE: "scope_read_node",
  SCOPE_CREATE_FRAME: "scope_create_frame",
  SCOPE_UPDATE_FRAME: "scope_update_frame",
  SCOPE_DELETE_NODE: "scope_delete_node",
  SCOPE_SET_PROTOTYPE: "scope_set_prototype",
  SCOPE_CREATE_FOREIGN_FIXTURE: "scope_create_foreign_fixture",
  SCOPE_DELETE_FOREIGN_FIXTURE: "scope_delete_foreign_fixture",
});

export const ALLOWED_COMMANDS = new Set(Object.values(COMMANDS));
