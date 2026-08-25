import { useState, useRef, useEffect, useCallback } from 'react';

export interface VoiceRecorderState {
  isRecording: boolean;
  transcript: string;
  interimTranscript: string;
  volume: number; // 0 to 1
  frequencies: Uint8Array;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetTranscript: () => void;
}

export function useVoiceRecorder(onTranscriptComplete?: (text: string) => void): VoiceRecorderState {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [volume, setVolume] = useState(0);
  const [frequencies, setFrequencies] = useState<Uint8Array>(new Uint8Array(32));
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  const processAudioData = useCallback(() => {
    if (!analyserRef.current || !isRecording) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate volume level (RMS approximation)
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avg = sum / dataArray.length;
    const normalizedVolume = Math.min(1, avg / 128);
    setVolume(normalizedVolume);

    // Subsample 32 bars for waveform visualizer
    const sampled = new Uint8Array(32);
    const step = Math.floor(bufferLength / 32);
    for (let i = 0; i < 32; i++) {
      sampled[i] = dataArray[i * step] || 0;
    }
    setFrequencies(sampled);

    animationFrameRef.current = requestAnimationFrame(processAudioData);
  }, [isRecording]);

  const startRecording = async () => {
    setError(null);
    try {
      // 1. Audio stream & Web Audio API
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      setIsRecording(true);

      // 2. Web Speech API STT
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }

          if (final) {
            setTranscript(prev => {
              const updated = (prev ? prev + ' ' : '') + final.trim();
              return updated;
            });
          }
          setInterimTranscript(interim);
        };

        recognition.onerror = (e: any) => {
          console.warn('Speech recognition error:', e.error);
        };

        recognition.start();
        recognitionRef.current = recognition;
      }
    } catch (err: any) {
      console.error('Failed to start voice capture:', err);
      setError(err.message || 'Microphone access denied');
      setIsRecording(false);
    }
  };

  const stopRecording = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    setIsRecording(false);
    setVolume(0);
    setFrequencies(new Uint8Array(32));

    const totalText = (transcript + ' ' + interimTranscript).trim();
    if (totalText && onTranscriptComplete) {
      onTranscriptComplete(totalText);
    }
  }, [transcript, interimTranscript, onTranscriptComplete]);

  const resetTranscript = () => {
    setTranscript('');
    setInterimTranscript('');
  };

  useEffect(() => {
    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(processAudioData);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording, processAudioData]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    isRecording,
    transcript,
    interimTranscript,
    volume,
    frequencies,
    error,
    startRecording,
    stopRecording,
    resetTranscript
  };
}
