// Route to local Next.js API in development. 
// For physical devices, use your local IP instead of localhost (e.g. http://192.168.1.X:3000)
// If using Android emulator, use http://10.0.2.2:3000
import { Platform } from 'react-native';
import EventSource from 'react-native-sse';

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // Fallback for emulators
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3005/api';
  }
  return 'http://localhost:3005/api';
};

const WEB_API_URL = getBaseUrl();

export interface ChatResponse {
  reply: string;
  time: string;
}

export async function sendChatMessage(message: string): Promise<ChatResponse> {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  try {
    const res = await fetch(`${WEB_API_URL}/reasoner`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: message }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.reply) {
        return {
          reply: json.reply,
          time: timeStr,
        };
      }
    } else {
      console.log('Web API returned an error status:', res.status);
    }
  } catch (err) {
    console.log('Error hitting Web API /chat:', err);
  }

  return {
    reply: "I am having trouble connecting to the Web Brain API.",
    time: timeStr,
  };
}

export function streamChatMessage(
  message: string, 
  onChunk: (text: string) => void,
  onComplete: () => void,
  onError: () => void
) {
  // Construct the URL with query parameter
  const url = `${WEB_API_URL}/reasoner/stream`;
  
  // We can't send a body with standard EventSource GET requests, 
  // but react-native-sse supports custom fetch options!
  const es = new EventSource(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: message })
  });

  es.addEventListener('message', (event) => {
    if (event.data) {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'token' && data.token) {
          onChunk(data.token);
        } else if (data.type === 'done') {
          es.close();
          onComplete();
        }
      } catch (e) {
        console.warn('Failed to parse SSE data', e);
      }
    }
  });

  es.addEventListener('error', (event) => {
    console.error('SSE Error:', event);
    es.close();
    onError();
  });

  return es;
}
