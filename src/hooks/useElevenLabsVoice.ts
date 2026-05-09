/**
 * useElevenLabsVoice — Real ElevenLabs Conversational AI WebSocket hook
 *
 * Manages:
 * - Signed URL retrieval
 * - WebSocket connection to ElevenLabs Conversational AI
 * - Browser microphone capture via AudioWorklet / ScriptProcessor
 * - Incoming audio playback via Web Audio API
 * - Conversation state machine (idle → listening → processing → speaking)
 * - Transcript accumulation (user + agent)
 * - Client tool-call forwarding
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

export type VoiceState = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking';

export interface VoiceTranscript {
  role: 'user' | 'agent';
  text: string;
  isFinal: boolean;
  timestamp: Date;
}

export interface ToolCall {
  toolName: string;
  toolCallId: string;
  parameters: Record<string, unknown>;
}

export interface UseElevenLabsVoiceOptions {
  agentId: string;
  /** Optional: use a signed URL endpoint instead of public agent */
  signedUrlEndpoint?: string;
  onTranscript?: (transcript: VoiceTranscript) => void;
  onToolCall?: (tool: ToolCall) => Promise<string>;
  onError?: (error: string) => void;
  onStateChange?: (state: VoiceState) => void;
}

export interface UseElevenLabsVoiceReturn {
  state: VoiceState;
  isActive: boolean;
  transcripts: VoiceTranscript[];
  conversationId: string | null;
  start: () => Promise<void>;
  stop: () => void;
  volume: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const ELEVENLABS_WS_BASE = 'wss://api.elevenlabs.io/v1/convai/conversation';
const SAMPLE_RATE = 16000;

// ── Helpers ──────────────────────────────────────────────────────────────────

function float32ToPcm16(float32: Float32Array): ArrayBuffer {
  const pcm16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return pcm16.buffer;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useElevenLabsVoice(options: UseElevenLabsVoiceOptions): UseElevenLabsVoiceReturn {
  const { agentId, signedUrlEndpoint, onTranscript, onToolCall, onError, onStateChange } = options;

  const [state, setState] = useState<VoiceState>('idle');
  const [transcripts, setTranscripts] = useState<VoiceTranscript[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const playbackQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  // Stable state setter that also calls callback
  const updateState = useCallback(
    (newState: VoiceState) => {
      setState(newState);
      onStateChange?.(newState);
    },
    [onStateChange],
  );

  // ── Audio playback queue ───────────────────────────────────────────────

  const playNextChunk = useCallback(async () => {
    if (isPlayingRef.current || playbackQueueRef.current.length === 0) return;

    isPlayingRef.current = true;

    while (playbackQueueRef.current.length > 0) {
      const chunk = playbackQueueRef.current.shift()!;
      if (!playbackCtxRef.current) {
        playbackCtxRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
      }

      const ctx = playbackCtxRef.current;

      try {
        // Convert PCM16 to Float32 for Web Audio
        const pcm16 = new Int16Array(chunk);
        const float32 = new Float32Array(pcm16.length);
        for (let i = 0; i < pcm16.length; i++) {
          float32[i] = pcm16[i] / 0x8000;
        }

        const audioBuffer = ctx.createBuffer(1, float32.length, SAMPLE_RATE);
        audioBuffer.getChannelData(0).set(float32);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;

        // Analyser for volume visualization
        if (!analyserRef.current) {
          analyserRef.current = ctx.createAnalyser();
          analyserRef.current.fftSize = 256;
          analyserRef.current.connect(ctx.destination);
        }

        source.connect(analyserRef.current);
        source.start();

        // Wait for chunk to finish
        await new Promise<void>((resolve) => {
          source.onended = () => resolve();
        });
      } catch {
        // Skip corrupt chunks
      }
    }

    isPlayingRef.current = false;
  }, []);

  // ── Volume animation loop ──────────────────────────────────────────────

  const startVolumeMonitor = useCallback(() => {
    const tick = () => {
      if (analyserRef.current) {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setVolume(avg / 255);
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  // ── Microphone capture ─────────────────────────────────────────────────

  const startMicrophone = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: SAMPLE_RATE,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    mediaStreamRef.current = stream;

    const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
    audioContextRef.current = audioCtx;

    const source = audioCtx.createMediaStreamSource(stream);
    sourceNodeRef.current = source;

    // TODO: Migrate to AudioWorklet for production — ScriptProcessor is deprecated.
    // AudioWorklet provides better performance and runs off the main thread.
    // See: https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletNode
    // Using ScriptProcessor for now as it has wider browser support and doesn't
    // require a separate module file.
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (event) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return;

      const inputData = event.inputBuffer.getChannelData(0);
      const pcm = float32ToPcm16(inputData);
      const base64 = arrayBufferToBase64(pcm);

      wsRef.current.send(
        JSON.stringify({
          user_audio_chunk: base64,
        }),
      );
    };

    source.connect(processor);
    processor.connect(audioCtx.destination); // needed for ScriptProcessor to fire
  }, []);

  const stopMicrophone = useCallback(() => {
    processorRef.current?.disconnect();
    sourceNodeRef.current?.disconnect();
    audioContextRef.current?.close();
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());

    processorRef.current = null;
    sourceNodeRef.current = null;
    audioContextRef.current = null;
    mediaStreamRef.current = null;
  }, []);

  // ── WebSocket message handler ──────────────────────────────────────────

  const handleMessage = useCallback(
    async (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        const type = data.type;

        switch (type) {
          case 'conversation_initiation_metadata': {
            const cid =
              data.conversation_initiation_metadata_event?.conversation_id || '';
            setConversationId(cid);
            break;
          }

          case 'audio': {
            // Agent audio chunk (base64 PCM16)
            updateState('speaking');
            const audioBase64 = data.audio_event?.audio_base_64 || data.audio?.chunk || '';
            if (audioBase64) {
              const audioBuffer = base64ToArrayBuffer(audioBase64);
              playbackQueueRef.current.push(audioBuffer);
              playNextChunk();
            }
            break;
          }

          case 'agent_response': {
            const text =
              data.agent_response_event?.agent_response ||
              data.agent_response?.agent_response ||
              '';
            if (text) {
              const transcript: VoiceTranscript = {
                role: 'agent',
                text,
                isFinal: true,
                timestamp: new Date(),
              };
              setTranscripts((prev) => [...prev, transcript]);
              onTranscript?.(transcript);
            }
            break;
          }

          case 'user_transcript': {
            const text =
              data.user_transcription_event?.user_transcript ||
              data.user_transcript?.user_transcript ||
              '';
            const isFinal = data.user_transcription_event?.is_final ?? true;
            if (text) {
              const transcript: VoiceTranscript = {
                role: 'user',
                text,
                isFinal,
                timestamp: new Date(),
              };
              if (isFinal) {
                setTranscripts((prev) => [...prev, transcript]);
              }
              onTranscript?.(transcript);
            }
            updateState('processing');
            break;
          }

          case 'client_tool_call': {
            const toolName = data.client_tool_call?.tool_name || '';
            const toolCallId = data.client_tool_call?.tool_call_id || '';
            const parameters = data.client_tool_call?.parameters || {};

            if (onToolCall) {
              const result = await onToolCall({ toolName, toolCallId, parameters });
              // Send tool result back
              wsRef.current?.send(
                JSON.stringify({
                  type: 'client_tool_result',
                  tool_call_id: toolCallId,
                  result,
                  is_error: false,
                }),
              );
            }
            break;
          }

          case 'ping': {
            const eventId = data.ping_event?.event_id;
            wsRef.current?.send(
              JSON.stringify({ type: 'pong', event_id: eventId }),
            );
            break;
          }

          case 'agent_response_correction': {
            // Agent corrected its response — update last transcript
            const corrected = data.agent_response_correction_event?.corrected_agent_response || '';
            if (corrected) {
              setTranscripts((prev) => {
                const copy = [...prev];
                const lastAgent = [...copy].reverse().find((t) => t.role === 'agent');
                if (lastAgent) lastAgent.text = corrected;
                return copy;
              });
            }
            break;
          }

          case 'interruption': {
            // User interrupted — clear playback queue
            playbackQueueRef.current = [];
            isPlayingRef.current = false;
            updateState('listening');
            break;
          }

          default:
            // VAD events, unknown types — silently ignore
            if (type === 'user_started_speaking') {
              updateState('listening');
            } else if (type === 'user_stopped_speaking') {
              updateState('processing');
            }
            break;
        }
      } catch {
        // Non-JSON message — ignore
      }
    },
    [onTranscript, onToolCall, updateState, playNextChunk],
  );

  // ── Start conversation ─────────────────────────────────────────────────

  const start = useCallback(async () => {
    if (state !== 'idle') return;

    try {
      updateState('connecting');

      // Build WS URL
      let wsUrl: string;

      if (signedUrlEndpoint) {
        const res = await fetch(signedUrlEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent_id: agentId || undefined }),
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(
            `Signed URL failed (${res.status}): ${errText.slice(0, 280)}`,
          );
        }
        const json = await res.json();
        wsUrl = json.signed_url || json.url;
        if (!wsUrl || typeof wsUrl !== 'string') {
          throw new Error('Backend did not return signed_url');
        }
      } else {
        wsUrl = `${ELEVENLABS_WS_BASE}?agent_id=${agentId}`;
      }

      // Connect WebSocket
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        // Send conversation config
        ws.send(
          JSON.stringify({
            type: 'conversation_initiation_client_data',
            conversation_initiation_client_data: {
              conversation_config_override: {
                agent: {
                  prompt: {
                    prompt:
                      'You are NEURO, an AI private banker for crypto natives. ' +
                      'You are intelligent, futuristic, calm, concise, and trustworthy. ' +
                      'You help users bridge assets across chains to Solana, analyze yield, ' +
                      'manage vault risk, and optimize DeFi portfolios. Be precise with numbers.',
                  },
                  first_message:
                    "Hello. I'm NEURO, your AI wealth operating system. " +
                    'I can bridge assets, analyze yield opportunities, and manage your vault risk. ' +
                    'What would you like to do?',
                  language: 'en',
                },
              },
            },
          }),
        );

        // Start microphone after WS is ready
        await startMicrophone();
        updateState('listening');
        startVolumeMonitor();
      };

      ws.onmessage = handleMessage;

      ws.onerror = () => {
        onError?.('WebSocket connection error. Check your agent ID and network.');
        stop();
      };

      ws.onclose = (event) => {
        if (event.code !== 1000) {
          onError?.(`Connection closed: ${event.reason || 'Unknown reason'} (code ${event.code})`);
        }
        cleanup();
        updateState('idle');
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start voice session';
      onError?.(msg);
      updateState('idle');
    }
  }, [
    state,
    agentId,
    signedUrlEndpoint,
    updateState,
    startMicrophone,
    startVolumeMonitor,
    handleMessage,
    onError,
  ]);

  // ── Stop conversation ──────────────���───────────────────────────────────

  const cleanup = useCallback(() => {
    stopMicrophone();
    cancelAnimationFrame(animFrameRef.current);
    analyserRef.current = null;
    playbackQueueRef.current = [];
    isPlayingRef.current = false;
    playbackCtxRef.current?.close();
    playbackCtxRef.current = null;
    setVolume(0);
  }, [stopMicrophone]);

  const stop = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User ended conversation');
      wsRef.current = null;
    }
    cleanup();
    updateState('idle');
  }, [cleanup, updateState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close(1000);
      cleanup();
    };
  }, [cleanup]);

  return {
    state,
    isActive: state !== 'idle',
    transcripts,
    conversationId,
    start,
    stop,
    volume,
  };
}
