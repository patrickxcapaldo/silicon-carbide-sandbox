export const BUILD_INFO = {
  sandboxVersion: typeof __APP_VERSION__ === 'undefined' ? 'development' : __APP_VERSION__,
  sourceCommit: typeof __SOURCE_COMMIT__ === 'undefined' ? 'unknown' : __SOURCE_COMMIT__,
  sourceDirty: typeof __SOURCE_DIRTY__ === 'undefined' ? true : __SOURCE_DIRTY__,
} as const