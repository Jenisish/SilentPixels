// Steganography utility functions
export class SteganographyService {
  // Convert text to binary
  static textToBinary(text: string): string {
    return text.split('').map(char => 
      char.charCodeAt(0).toString(2).padStart(8, '0')
    ).join('');
  }

  // Convert binary to text
  static binaryToText(binary: string): string {
    const bytes = binary.match(/.{1,8}/g) || [];
    return bytes.map(byte => 
      String.fromCharCode(parseInt(byte, 2))
    ).join('');
  }

  // Encode message into media
  static async encode(file: File, message: string): Promise<string> {
    if (file.type.startsWith('video/')) {
      return this.encodeVideo(file, message);
    } else if (file.type.startsWith('audio/')) {
      return this.encodeAudio(file, message);
    }
    return this.encodeImage(file, message);
  }

  // Decode message from media
  static async decode(file: File): Promise<string> {
    if (file.type.startsWith('video/')) {
      return this.decodeVideo(file);
    } else if (file.type.startsWith('audio/')) {
      return this.decodeAudio(file);
    }
    return this.decodeImage(file);
  }

  // Image encoding
  private static async encodeImage(image: File, message: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Convert message to binary
        const binaryMessage = this.textToBinary(message);
        const messageLength = binaryMessage.length;

        // Check if message can fit in image
        if (messageLength > (data.length / 4) * 3) {
          reject(new Error('Message is too long for this image'));
          return;
        }

        // Store message length at the beginning
        const lengthBinary = messageLength.toString(2).padStart(32, '0');
        let binaryIndex = 0;

        // Encode length
        for (let i = 0; i < 32; i++) {
          data[i] = (data[i] & 254) | parseInt(lengthBinary[i]);
        }

        // Encode message
        for (let i = 32; i < messageLength + 32; i++) {
          if (binaryIndex < binaryMessage.length) {
            data[i] = (data[i] & 254) | parseInt(binaryMessage[binaryIndex]);
            binaryIndex++;
          }
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL());
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      reader.readAsDataURL(image);
    });
  }

  // Image decoding
  private static async decodeImage(image: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Extract length
        let lengthBinary = '';
        for (let i = 0; i < 32; i++) {
          lengthBinary += data[i] & 1;
        }
        const messageLength = parseInt(lengthBinary, 2);

        // Extract message
        let binaryMessage = '';
        for (let i = 32; i < messageLength + 32; i++) {
          binaryMessage += data[i] & 1;
        }

        const message = this.binaryToText(binaryMessage);
        resolve(message);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      reader.readAsDataURL(image);
    });
  }

  // Video encoding
  private static async encodeVideo(video: File, message: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const videoElement = document.createElement('video');
      const reader = new FileReader();

      reader.onload = (e) => {
        videoElement.src = e.target?.result as string;
      };

      videoElement.onloadeddata = async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Get the first frame
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        ctx.drawImage(videoElement, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Convert message to binary
        const binaryMessage = this.textToBinary(message);
        const messageLength = binaryMessage.length;

        // Check if message can fit in frame
        if (messageLength > (data.length / 4) * 3) {
          reject(new Error('Message is too long for this video frame'));
          return;
        }

        // Store message length at the beginning
        const lengthBinary = messageLength.toString(2).padStart(32, '0');
        let binaryIndex = 0;

        // Encode length
        for (let i = 0; i < 32; i++) {
          data[i] = (data[i] & 254) | parseInt(lengthBinary[i]);
        }

        // Encode message
        for (let i = 32; i < messageLength + 32; i++) {
          if (binaryIndex < binaryMessage.length) {
            data[i] = (data[i] & 254) | parseInt(binaryMessage[binaryIndex]);
            binaryIndex++;
          }
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL());
      };

      videoElement.onerror = () => {
        reject(new Error('Failed to load video'));
      };

      reader.readAsDataURL(video);
    });
  }

  // Video decoding
  private static async decodeVideo(video: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const videoElement = document.createElement('video');
      const reader = new FileReader();

      reader.onload = (e) => {
        videoElement.src = e.target?.result as string;
      };

      videoElement.onloadeddata = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Get the first frame
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        ctx.drawImage(videoElement, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Extract length
        let lengthBinary = '';
        for (let i = 0; i < 32; i++) {
          lengthBinary += data[i] & 1;
        }
        const messageLength = parseInt(lengthBinary, 2);

        // Extract message
        let binaryMessage = '';
        for (let i = 32; i < messageLength + 32; i++) {
          binaryMessage += data[i] & 1;
        }

        const message = this.binaryToText(binaryMessage);
        resolve(message);
      };

      videoElement.onerror = () => {
        reject(new Error('Failed to load video'));
      };

      reader.readAsDataURL(video);
    });
  }

  // Audio encoding
  private static async encodeAudio(audio: File, message: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const audioContext = new AudioContext();
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const audioBuffer = await audioContext.decodeAudioData(e.target?.result as ArrayBuffer);
          const channelData = audioBuffer.getChannelData(0);
          
          // Convert message to binary
          const binaryMessage = this.textToBinary(message);
          const messageLength = binaryMessage.length;

          // Check if message can fit in audio
          if (messageLength > channelData.length / 8) {
            reject(new Error('Message is too long for this audio file'));
            return;
          }

          // Store message length at the beginning
          const lengthBinary = messageLength.toString(2).padStart(32, '0');
          
          // Create modified buffer
          const modifiedBuffer = audioContext.createBuffer(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            audioBuffer.sampleRate
          );
          
          const modifiedData = modifiedBuffer.getChannelData(0);
          
          // Copy original data
          modifiedData.set(channelData);

          // Encode length
          for (let i = 0; i < 32; i++) {
            modifiedData[i] = Math.floor(channelData[i] * 1000) / 1000 + 
              (parseInt(lengthBinary[i]) * 0.0001);
          }

          // Encode message
          for (let i = 0; i < messageLength; i++) {
            modifiedData[i + 32] = Math.floor(channelData[i + 32] * 1000) / 1000 + 
              (parseInt(binaryMessage[i]) * 0.0001);
          }

          // Convert to WAV
          const offlineContext = new OfflineAudioContext(
            modifiedBuffer.numberOfChannels,
            modifiedBuffer.length,
            modifiedBuffer.sampleRate
          );

          const source = offlineContext.createBufferSource();
          source.buffer = modifiedBuffer;
          source.connect(offlineContext.destination);
          source.start();

          const renderedBuffer = await offlineContext.startRendering();
          const wavBlob = this.bufferToWav(renderedBuffer);
          const url = URL.createObjectURL(wavBlob);
          
          resolve(url);
        } catch (err) {
          reject(new Error('Failed to process audio file'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to load audio file'));
      };

      reader.readAsArrayBuffer(audio);
    });
  }

  // Audio decoding
  private static async decodeAudio(audio: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const audioContext = new AudioContext();
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const audioBuffer = await audioContext.decodeAudioData(e.target?.result as ArrayBuffer);
          const channelData = audioBuffer.getChannelData(0);

          // Extract length
          let lengthBinary = '';
          for (let i = 0; i < 32; i++) {
            const sample = channelData[i];
            lengthBinary += Math.round((sample * 10000) % 2);
          }
          const messageLength = parseInt(lengthBinary, 2);

          // Extract message
          let binaryMessage = '';
          for (let i = 0; i < messageLength; i++) {
            const sample = channelData[i + 32];
            binaryMessage += Math.round((sample * 10000) % 2);
          }

          const message = this.binaryToText(binaryMessage);
          resolve(message);
        } catch (err) {
          reject(new Error('Failed to process audio file'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to load audio file'));
      };

      reader.readAsArrayBuffer(audio);
    });
  }

  // Helper function to convert AudioBuffer to WAV
  private static bufferToWav(buffer: AudioBuffer): Blob {
    const numOfChannels = buffer.numberOfChannels;
    const length = buffer.length * numOfChannels * 2;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);

    // Write WAV header
    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numOfChannels * 2, true);
    view.setUint16(32, numOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, length, true);

    // Write audio data
    const channelData = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < channelData.length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }
}