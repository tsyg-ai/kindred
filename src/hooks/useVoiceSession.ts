import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { startLiveInterviewSession, getEphemeralToken } from '../services/gemini';
import { getQuestionText, type Question } from '../services/questions';

interface UseVoiceSessionOptions {
  questions: Question[];
  childName: string;
  childAge: string;
  language: string;
  initialAnswers?: Record<string, string>;
  /** Instruction injected after the last answer, before finishInterview is called. */
  finishMessage: string;
  onFinish: (answers: Record<string, string>) => void;
  onError?: (message: string) => void;
}

interface UseVoiceSessionResult {
  isConnecting: boolean;
  isRecording: boolean;
  liveAnswers: Record<string, string>;
  start: () => Promise<void>;
  stop: () => void;
}

export function useVoiceSession({
  questions,
  childName,
  childAge,
  language,
  initialAnswers = {},
  finishMessage,
  onFinish,
  onError,
}: UseVoiceSessionOptions): UseVoiceSessionResult {
  const { t } = useTranslation();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [liveAnswers, setLiveAnswers] = useState<Record<string, string>>(initialAnswers);

  const sessionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const liveAnswersRef = useRef<Record<string, string>>(initialAnswers);
  const currentQuestionIndexRef = useRef<number>(0);

  const stop = () => {
    setIsConnecting(false);
    setIsRecording(false);
    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (inputAudioCtxRef.current) { inputAudioCtxRef.current.close(); inputAudioCtxRef.current = null; }
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
    if (sessionRef.current) { sessionRef.current.then((s: any) => s.close()); sessionRef.current = null; }
  };

  useEffect(() => () => stop(), []);

  const start = async () => {
    try {
      setIsConnecting(true);
      setLiveAnswers({ ...initialAnswers });
      liveAnswersRef.current = { ...initialAnswers };
      currentQuestionIndexRef.current = 0;

      audioCtxRef.current = new AudioContext({ sampleRate: 24000 });
      nextTimeRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const inputAudioCtx = new AudioContext({ sampleRate: 16000 });
      inputAudioCtxRef.current = inputAudioCtx;
      const source = inputAudioCtx.createMediaStreamSource(stream);
      const processor = inputAudioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      const callbacks = {
        onopen: () => {
          setIsConnecting(false);
          setIsRecording(true);

          sessionPromise.then((session: any) => {
            const intro = language === 'nl'
              ? `Hé ${childName}! Wat leuk dat je er bent. Ik ga je een paar vragen stellen en daarna maak ik een leuke profielafbeelding speciaal voor jou!`
              : `Hey ${childName}! Great to be talking to you! I'm going to ask you a few questions and then I'll create a fun profile image just for you!`;
            session.sendClientContent({
              turns: [{
                role: 'user',
                parts: [{ text: `You're talking to ${childName}, ${childAge || 'a child'} years old. Start by saying this introduction greeting exactly: "${intro}". Then immediately ask the first question: ${getQuestionText(questions[0], language)}` }],
              }],
              turnComplete: true,
            });
          });

          processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcm16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]));
              pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            const buffer = new ArrayBuffer(pcm16.length * 2);
            const view = new DataView(buffer);
            for (let i = 0; i < pcm16.length; i++) view.setInt16(i * 2, pcm16[i], true);
            const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
            sessionPromise.then((session: any) => {
              session.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } });
            });
          };
          source.connect(processor);
          processor.connect(inputAudioCtx.destination);
        },

        onmessage: async (message: any) => {
          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64Audio && audioCtxRef.current) {
            const binaryString = atob(base64Audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
            const audioBuffer = audioCtxRef.current.createBuffer(1, bytes.length / 2, 24000);
            const dataView = new DataView(bytes.buffer);
            for (let i = 0; i < audioBuffer.length; i++) {
              audioBuffer.getChannelData(0)[i] = dataView.getInt16(i * 2, true) / 0x8000;
            }
            const playSource = audioCtxRef.current.createBufferSource();
            playSource.buffer = audioBuffer;
            playSource.connect(audioCtxRef.current.destination);
            if (nextTimeRef.current < audioCtxRef.current.currentTime) nextTimeRef.current = audioCtxRef.current.currentTime;
            playSource.start(nextTimeRef.current);
            nextTimeRef.current += audioBuffer.duration;
          }

          if (message.serverContent?.interrupted && audioCtxRef.current) {
            audioCtxRef.current.close();
            audioCtxRef.current = new AudioContext({ sampleRate: 24000 });
            nextTimeRef.current = 0;
          }

          if (message.toolCall) {
            const responses: any[] = [];
            for (const call of message.toolCall.functionCalls) {
              if (call.name === 'recordAnswer') {
                const currentQ = questions[currentQuestionIndexRef.current];
                liveAnswersRef.current[currentQ.id] = call.args.answer;
                setLiveAnswers({ ...liveAnswersRef.current });
                currentQuestionIndexRef.current += 1;
                const isLast = currentQuestionIndexRef.current >= questions.length;
                const nextInstruction = isLast
                  ? finishMessage
                  : `Next question you should ask: ${getQuestionText(questions[currentQuestionIndexRef.current], language)}`;
                responses.push({ id: call.id, name: call.name, response: { result: 'recorded', nextInstruction } });
              } else if (call.name === 'finishInterview') {
                responses.push({ id: call.id, name: call.name, response: { result: 'finishing' } });
                const delay = audioCtxRef.current && nextTimeRef.current > audioCtxRef.current.currentTime
                  ? (nextTimeRef.current - audioCtxRef.current.currentTime) * 1000
                  : 0;
                setTimeout(() => { stop(); onFinish(liveAnswersRef.current); }, delay + 500);
              }
            }
            if (responses.length > 0 && sessionRef.current) {
              sessionRef.current.then((session: any) => session.sendToolResponse({ functionResponses: responses }));
            }
          }
        },

        onerror: (err: any) => {
          console.error('Live API Error:', err);
          onError?.(t('voiceInterview.errors.connection'));
          stop();
        },

        onclose: () => stop(),
      };

      const ephemeralToken = await getEphemeralToken();
      const sessionPromise = startLiveInterviewSession(callbacks, childName, childAge, language, ephemeralToken);
      sessionRef.current = sessionPromise;
    } catch (err: any) {
      console.error(err);
      onError?.(t('voiceInterview.errors.microphone'));
      setIsConnecting(false);
      setIsRecording(false);
    }
  };

  return { isConnecting, isRecording, liveAnswers, start, stop };
}
