import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json({ error: 'OpenAI API Key not configured' }, { status: 500 });
    }

    // Forward the FormData to OpenAI Whisper API
    // The whisper-1 model requires a multipart/form-data request with 'file' and 'model'
    const whisperFormData = new FormData();
    whisperFormData.append('file', file);
    whisperFormData.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: whisperFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Whisper Error:', errorText);
      return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: response.status });
    }

    const json = await response.json();
    
    if (json.text) {
      return NextResponse.json({ text: json.text });
    }

    return NextResponse.json({ error: 'No text returned from Whisper' }, { status: 500 });
    
  } catch (error) {
    console.error('Transcription Error:', error);
    return NextResponse.json({ error: 'Internal server error during transcription' }, { status: 500 });
  }
}
