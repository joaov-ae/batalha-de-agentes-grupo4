import { useEffect, useRef, useState } from 'react';

export type VoiceStatus = 'idle' | 'recording' | 'transcribing';

const MAX_SECONDS = 60;

// Converte o áudio gravado (webm/ogg) em WAV mono 16 kHz, formato aceito por Gemini e Speech-to-Text
async function blobToWavBase64(blob: Blob): Promise<string> {
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  await ctx.close();

  const rate = 16000;
  const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * rate)), rate);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const pcm = (await offline.startRendering()).getChannelData(0);

  const view = new DataView(new ArrayBuffer(44 + pcm.length * 2));
  const writeStr = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, pcm.length * 2, true);
  pcm.forEach((s, i) => view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 0x7fff, true));

  const bytes = new Uint8Array(view.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/** Intenção de Pix identificada pelo Gemini junto com a transcrição */
export interface VoicePixIntent {
  valor: number | null;
  destinatario: string | null;
}

export interface VoiceCallbacks {
  /** Gravação concluída: áudio pronto para aparecer na conversa (antes da transcrição) */
  onRecorded: (audio: { url: string; duration: number }) => void;
  /** Texto transcrito do áudio (+ intenção de Pix, quando o servidor identificar) */
  onResult: (text: string, pix: VoicePixIntent | null) => void;
  /** Falha ao gravar ou transcrever; `recorded` indica se o áudio já tinha ido para a conversa */
  onError: (msg: string, recorded: boolean) => void;
}

/**
 * Grava áudio do microfone e devolve o texto transcrito (sem exibir o texto durante a gravação).
 * 1º: envia o áudio para /api/transcribe (Gemini no servidor).
 * Reserva: Web Speech API do navegador (Chrome/Edge), que roda em paralelo durante a gravação.
 */
export function useVoiceInput(callbacks: VoiceCallbacks) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [elapsed, setElapsed] = useState(0);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;
  const onError = (msg: string, recorded = false) => callbacksRef.current.onError(msg, recorded);
  const startedAtRef = useRef(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const speechTextRef = useRef('');
  const cancelledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* já parado */
    }
  };

  useEffect(() => () => cleanup(), []);

  const transcribe = async () => {
    const blob = new Blob(chunksRef.current, { type: recorderRef.current?.mimeType || 'audio/webm' });
    const duration = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    if (duration < 1 || blob.size === 0) {
      setStatus('idle');
      onError('Áudio muito curto. Segure um pouco mais para gravar.');
      return;
    }

    setStatus('transcribing');
    callbacksRef.current.onRecorded({ url: URL.createObjectURL(blob), duration });
    let text = '';
    let pix: VoicePixIntent | null = null;

    try {
      const audio = await blobToWavBase64(blob);
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio, mimeType: 'audio/wav' }),
      });
      if (res.ok) {
        const data = await res.json();
        text = (data.text || '').trim();
        pix = data.pix || null;
      }
    } catch (err) {
      console.warn('Transcrição no servidor falhou, usando reconhecimento do navegador.', err);
    }

    if (!text) {
      // Dá tempo para o reconhecimento do navegador entregar o resultado final
      await new Promise((r) => setTimeout(r, 400));
      text = speechTextRef.current.trim();
    }

    setStatus('idle');
    if (text) callbacksRef.current.onResult(text, pix);
    else onError('Não consegui entender o áudio. Tente de novo, falando mais perto do microfone.', true);
  };

  const start = async () => {
    if (status !== 'idle') return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      onError('Seu navegador não permite gravar áudio.');
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      onError('Permita o acesso ao microfone para enviar áudio.');
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    speechTextRef.current = '';
    cancelledRef.current = false;
    setElapsed(0);

    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    recorder.onstop = () => {
      cleanup();
      if (cancelledRef.current) {
        setStatus('idle');
      } else {
        transcribe();
      }
    };
    recorderRef.current = recorder;
    recorder.start();

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      try {
        const rec = new SR();
        rec.lang = 'pt-BR';
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (e: any) => {
          const text = Array.from(e.results as ArrayLike<any>)
            .map((r: any) => r[0].transcript)
            .join(' ')
            .replace(/\s+/g, ' ');
          // Guardado só como reserva; não é exibido durante a gravação
          speechTextRef.current = text;
        };
        rec.onerror = () => {};
        rec.start();
        recognitionRef.current = rec;
      } catch {
        recognitionRef.current = null;
      }
    }

    const startedAt = Date.now();
    startedAtRef.current = startedAt;
    timerRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - startedAt) / 1000);
      setElapsed(secs);
      if (secs >= MAX_SECONDS) stop();
    }, 250);

    setStatus('recording');
  };

  const stop = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const cancel = () => {
    cancelledRef.current = true;
    stop();
  };

  return { status, elapsed, start, stop, cancel, maxSeconds: MAX_SECONDS };
}
