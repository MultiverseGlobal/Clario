// import { RTCPeerConnection, RTCSessionDescription, mediaDevices, MediaStream } from 'react-native-webrtc';
import { Platform } from 'react-native';

// Mocks for Expo Go compatibility (WebRTC requires custom dev client)
const RTCPeerConnection = class {} as any;
const RTCSessionDescription = class {} as any;
const mediaDevices = { getUserMedia: async () => ({ getTracks: () => [] }) } as any;
type MediaStream = any;

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api';
  }
  return 'http://localhost:3000/api';
};

export class WebRTCService {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private dc: any = null;
  private audioElement: any = null; // Used in React web, but in React Native we use RTCView or MediaStream playing

  public onTranscriptChange: ((text: string) => void) | null = null;
  public onStateChange: ((state: 'connecting' | 'listening' | 'speaking' | 'error') => void) | null = null;
  
  // Audio playback via React Native WebRTC handles incoming tracks automatically
  // but we can expose the remote stream if needed.
  public onRemoteStream: ((stream: MediaStream) => void) | null = null;

  async start() {
    this.onStateChange?.('connecting');
    try {
      // 1. Get ephemeral token from our backend
      const tokenRes = await fetch(`${getBaseUrl()}/webrtc-token`, { method: 'POST' });
      const sessionData = await tokenRes.json();
      const ephemeralKey = sessionData.client_secret?.value;

      if (!ephemeralKey) {
        throw new Error('Failed to retrieve ephemeral token');
      }

      // 2. Initialize Peer Connection
      const pc = new RTCPeerConnection({
        iceServers: []
      });
      this.pc = pc;

      // 3. Set up remote track handling
      pc.ontrack = (event: any) => {
        if (event.streams && event.streams[0]) {
          console.log("Received remote stream");
          this.onRemoteStream?.(event.streams[0]);
        }
      };

      // 4. Set up local microphone stream
      const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
      this.localStream = stream;
      
      // Add track to peer connection
      stream.getTracks().forEach((track: any) => {
        pc.addTrack(track, stream);
      });

      // 5. Create Data Channel for events (e.g. transcriptions)
      const dc = pc.createDataChannel('oai-events');
      this.dc = dc;
      dc.onopen = () => {
        console.log('Data channel opened');
        this.onStateChange?.('listening');
      };
      
      dc.onmessage = (e: any) => {
        try {
          const msg = JSON.parse(e.data);
          
          if (msg.type === 'response.audio_transcript.delta') {
            // AI is speaking
            this.onStateChange?.('speaking');
          }
          
          // Optionally, handle partial user transcripts if configured
          if (msg.type === 'conversation.item.input_audio_transcription.completed') {
            this.onTranscriptChange?.(msg.transcript);
          }
          
        } catch (err) {
          console.error('Data channel message parse error:', err);
        }
      };

      // 6. Create Offer
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
      await pc.setLocalDescription(offer);

      // 7. Send Offer to OpenAI
      const sdpResponse = await fetch("https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17", {
        method: "POST",
        body: offer.sdp,
        headers: {
          "Authorization": `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp"
        }
      });

      if (!sdpResponse.ok) {
        throw new Error(`OpenAI SDP Error: ${sdpResponse.status}`);
      }

      const answerSdp = await sdpResponse.text();

      // 8. Set Remote Description
      await pc.setRemoteDescription(new RTCSessionDescription({
        type: 'answer',
        sdp: answerSdp
      }));
      
    } catch (err) {
      console.error('WebRTC initialization failed:', err);
      this.onStateChange?.('error');
    }
  }

  stop() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((t: any) => t.stop());
      this.localStream = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    if (this.dc) {
      this.dc.close();
      this.dc = null;
    }
    this.onStateChange?.('listening'); // Reset state
  }
}

export const webrtcService = new WebRTCService();
