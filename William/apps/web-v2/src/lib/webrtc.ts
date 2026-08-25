import { useState, useRef, useCallback } from 'react';

export type WebRTCState = 'disconnected' | 'connecting' | 'connected' | 'error';

export function useWebRTC() {
  const [state, setState] = useState<WebRTCState>('disconnected');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Callbacks for events
  const onTranscriptRef = useRef<((text: string, role: 'user' | 'assistant') => void) | undefined>(undefined);

  const setOnTranscript = useCallback((cb: (text: string, role: 'user' | 'assistant') => void) => {
    onTranscriptRef.current = cb;
  }, []);

  const connect = async () => {
    try {
      setState('connecting');

      // 1. Get Ephemeral Token
      const tokenResponse = await fetch('/api/webrtc-token', { method: 'POST' });
      if (!tokenResponse.ok) throw new Error('Failed to fetch WebRTC token');
      const data = await tokenResponse.json();
      const ephemeralKey = data.client_secret.value;

      // 2. Setup RTCPeerConnection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Handle Remote Audio Track
      pc.ontrack = (e) => {
        if (e.streams && e.streams[0]) {
          setRemoteStream(e.streams[0]);
        } else {
          const stream = new MediaStream([e.track]);
          setRemoteStream(stream);
        }
      };

      // Handle Data Channel Events
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          
          // User finished speaking and was transcribed
          if (event.type === 'conversation.item.input_audio_transcription.completed') {
            if (onTranscriptRef.current && event.transcript) {
              onTranscriptRef.current(event.transcript, 'user');
            }
          }
          
          // Assistant finished responding and we have the transcript
          if (event.type === 'response.audio_transcript.done') {
            if (onTranscriptRef.current && event.transcript) {
              onTranscriptRef.current(event.transcript, 'assistant');
            }
          }
        } catch (err) {
          console.error('Failed to parse WebRTC data channel message', err);
        }
      };

      // 3. Capture Local Audio
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = localStream;
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

      // 4. Create and Set Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 5. Send Offer to OpenAI Realtime Endpoint
      const baseUrl = 'https://api.openai.com/v1/realtime';
      const model = 'gpt-4o-realtime-preview-2024-12-17';
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
      });

      if (!sdpResponse.ok) {
        throw new Error(`OpenAI SDP Error: ${sdpResponse.status}`);
      }

      const answerSdp = await sdpResponse.text();
      const answer = {
        type: 'answer' as RTCSdpType,
        sdp: answerSdp,
      };

      // 6. Set Remote Description
      await pc.setRemoteDescription(answer);

      // Tell OpenAI to require user audio transcription
      dc.onopen = () => {
        const updateSessionEvent = {
          type: "session.update",
          session: {
            input_audio_transcription: {
              model: "whisper-1",
            },
          },
        };
        dc.send(JSON.stringify(updateSessionEvent));
      };

      setState('connected');
    } catch (err) {
      console.error('WebRTC Connection Error:', err);
      setState('error');
      disconnect();
    }
  };

  const disconnect = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setRemoteStream(null);
    setState('disconnected');
  }, []);

  return {
    state,
    remoteStream,
    connect,
    disconnect,
    setOnTranscript,
  };
}
