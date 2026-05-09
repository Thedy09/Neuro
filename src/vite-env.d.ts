/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SOLANA_RPC_URL?: string;
  readonly VITE_QUICKNODE_RPC_URL?: string;
  readonly VITE_QUICKNODE_WS_URL?: string;
  readonly VITE_ELEVENLABS_AGENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
