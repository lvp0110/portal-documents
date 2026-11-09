interface ImportMetaEnv {
  readonly VITE_DOCUMENTS_API_URL?: string
  readonly VITE_PORTAL_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
