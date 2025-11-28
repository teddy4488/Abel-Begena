/**
 * Audio Export Manager
 * Handles exporting recorded sessions as WAV or MP3 files
 */

import { RecordedNote } from "./recorder";
import { soundManager } from "./sound";

/**
 * Export recording as WAV file
 * Uses Web Audio API to generate audio buffer and download
 */
export async function exportToWAV(notes: RecordedNote[]): Promise<Blob | null> {
  if (notes.length === 0) return null;

  try {
    const qinitInfo = soundManager.getQinitInfo();
    const sampleRate = 44100;
    const duration = (notes[notes.length - 1].timestamp + 5000) / 1000; // Add 5 seconds padding
    const numChannels = 1; // Mono
    const length = Math.floor(sampleRate * duration);
    
    // Create audio context for offline rendering
    const offlineContext = new OfflineAudioContext(numChannels, length, sampleRate);
    const destination = offlineContext.destination;

    // Schedule all notes
    notes.forEach((note) => {
      const time = note.timestamp / 1000;
      if (time < 0 || time >= duration) return;

      const playableIndex = [1, 4, 6, 8, 10].indexOf(note.stringIndex);
      if (playableIndex === -1) return;

      const frequency = qinitInfo.frequencies[playableIndex];
      
      // Create oscillator for this note (simplified - in production, use actual Begena sound)
      const oscillator = offlineContext.createOscillator();
      const gainNode = offlineContext.createGain();
      
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      
      // Envelope: quick attack, long decay
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(0.7, time + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + 4.5);
      
      oscillator.connect(gainNode);
      gainNode.connect(destination);
      
      oscillator.start(time);
      oscillator.stop(time + 4.5);
    });

    // Render audio
    const audioBuffer = await offlineContext.startRendering();
    
    // Convert to WAV
    const wav = audioBufferToWav(audioBuffer);
    return new Blob([wav], { type: "audio/wav" });
  } catch (error) {
    console.error("Failed to export WAV:", error);
    return null;
  }
}

/**
 * Convert AudioBuffer to WAV format
 */
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const length = buffer.length;
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
  const view = new DataView(arrayBuffer);

  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + length * numberOfChannels * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // audio format (PCM)
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * 2, true); // byte rate
  view.setUint16(32, numberOfChannels * 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, length * numberOfChannels * 2, true);

  // Convert audio data
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return arrayBuffer;
}

/**
 * Download audio file
 */
export function downloadAudio(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export as MP3 (requires external library like lamejs or server-side conversion)
 * For now, we'll export as WAV and note that MP3 conversion would need server-side processing
 */
export async function exportToMP3(notes: RecordedNote[]): Promise<Blob | null> {
  // MP3 encoding requires additional libraries or server-side processing
  // For now, return null and recommend using WAV or implementing server-side conversion
  console.warn(
    `MP3 export requires server-side conversion or additional libraries. Received ${notes.length} note(s). Use WAV export instead.`,
  );
  return null;
}

