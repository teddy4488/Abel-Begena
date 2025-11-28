/**
 * Recording Manager for Virtual Begena
 * Captures and plays back user sessions
 */

export interface RecordedNote {
  stringIndex: number;
  timestamp: number;
}

class Recorder {
  private notes: RecordedNote[] = [];
  private startTime: number = 0;
  private isRecording: boolean = false;
  private playbackTimeout: NodeJS.Timeout | null = null;
  private playbackCallbacks: Array<(stringIndex: number) => void> = [];

  startRecording() {
    this.notes = [];
    this.startTime = Date.now();
    this.isRecording = true;
  }

  stopRecording() {
    this.isRecording = false;
  }

  recordNote(stringIndex: number) {
    if (!this.isRecording) return;
    
    const timestamp = Date.now() - this.startTime;
    this.notes.push({ stringIndex, timestamp });
  }

  getRecording(): RecordedNote[] {
    return [...this.notes];
  }

  clearRecording() {
    this.notes = [];
  }

  onPlayback(callback: (stringIndex: number) => void) {
    this.playbackCallbacks.push(callback);
  }

  removePlaybackCallback(callback: (stringIndex: number) => void) {
    this.playbackCallbacks = this.playbackCallbacks.filter(cb => cb !== callback);
  }

  playRecording(onNotePlay: (stringIndex: number) => void) {
    if (this.notes.length === 0) return;

    // Clear any existing playback
    if (this.playbackTimeout) {
      clearTimeout(this.playbackTimeout);
    }

    // Play notes in sequence based on timestamps
    this.notes.forEach((note) => {
      setTimeout(() => {
        onNotePlay(note.stringIndex);
        this.playbackCallbacks.forEach(cb => cb(note.stringIndex));
      }, note.timestamp);
    });
  }

  stopPlayback() {
    if (this.playbackTimeout) {
      clearTimeout(this.playbackTimeout);
    }
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }
}

// Singleton instance
export const recorder = new Recorder();
