import { config } from '../config.js';

/**
 * Text-to-Speech (TTS)
 * Generates audio buffer from text. Supports Khmer and English.
 */
export async function textToSpeech(text, lang = 'km') {
  try {
    // If OpenAI API key is configured, use OpenAI TTS
    if (config.openaiApiKey) {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'tts-1',
          voice: 'alloy',
          input: text
        })
      });

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
    }

    // Free Fallback: Google TTS (Supports Khmer 'km' and English 'en')
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text.substring(0, 200))}&tl=${lang}&client=tw-ob`;
    const res = await fetch(ttsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
    
    throw new Error('TTS service unavailable');
  } catch (err) {
    console.error('TTS generation error:', err.message);
    throw err;
  }
}

/**
 * Speech-to-Text (STT)
 * Transcribes audio file into text using OpenAI Whisper
 */
export async function speechToText(audioBuffer, filename = 'voice.ogg') {
  if (!config.openaiApiKey) {
    return '⚠️ STT requires OPENAI_API_KEY in .env to transcribe voice messages.';
  }

  try {
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: 'audio/ogg' });
    formData.append('file', blob, filename);
    formData.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openaiApiKey}`
      },
      body: formData
    });

    const data = await response.json();
    return data.text || 'Could not transcribe audio.';
  } catch (err) {
    console.error('STT transcription error:', err.message);
    return `Error transcribing voice: ${err.message}`;
  }
}

