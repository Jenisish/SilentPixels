export class SteganographyService {
  private static SIGNATURE = "SPv2"; // Signature to identify new encrypted format

  // Convert text to binary (improved for UTF-8)
  static textToBinary(text: string): string {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    return Array.from(bytes).map(byte => byte.toString(2).padStart(8, '0')).join('');
  }

  // Convert binary to text (improved for UTF-8)
  static binaryToText(binary: string): string {
    const bytes = binary.match(/.{1,8}/g) || [];
    const uint8 = new Uint8Array(bytes.map(byte => parseInt(byte, 2)));
    return new TextDecoder().decode(uint8);
  }

  // Convert ArrayBuffer to binary string
  private static arrayBufferToBinary(buffer: ArrayBuffer): string {
    const uint8 = new Uint8Array(buffer);
    return Array.from(uint8).map(byte => byte.toString(2).padStart(8, '0')).join('');
  }

  // Convert binary string to ArrayBuffer
  private static binaryToArrayBuffer(binary: string): ArrayBuffer {
    const byteLength = Math.ceil(binary.length / 8);
    const buffer = new ArrayBuffer(byteLength);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < byteLength; i++) {
      const start = i * 8;
      const end = Math.min(start + 8, binary.length);
      const byteStr = binary.slice(start, end).padEnd(8, '0');
      view[i] = parseInt(byteStr, 2);
    }
    return buffer;
  }

  // Encrypt message with key
  private static async encryptMessage(message: string, key: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16)); // 16 bytes salt
    const iv = crypto.getRandomValues(new Uint8Array(12));   // 12 bytes IV
    const password = new TextEncoder().encode(key);
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: 10000,
        hash: "SHA-256",
      },
      await crypto.subtle.importKey("raw", password, { name: "PBKDF2" }, false, ["deriveKey"]),
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"]
    );

    const encodedMessage = new TextEncoder().encode(message);
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      derivedKey,
      encodedMessage
    );

    const signatureBinary = this.textToBinary(this.SIGNATURE); // "SPv2" (32 bits)
    const saltBinary = this.arrayBufferToBinary(salt.buffer);  // 128 bits
    const ivBinary = this.arrayBufferToBinary(iv.buffer);      // 96 bits
    const encryptedBinary = this.arrayBufferToBinary(encrypted);

    return signatureBinary + saltBinary + ivBinary + encryptedBinary;
  }

  // Decrypt hidden data with key
  private static async decryptHiddenData(hiddenDataBinary: string, key: string): Promise<string> {
    const signatureLength = this.textToBinary(this.SIGNATURE).length; // 32 bits
    const signatureBinary = hiddenDataBinary.slice(0, signatureLength);
    if (signatureBinary !== this.textToBinary(this.SIGNATURE)) {
      // Old format: no encryption
      return this.binaryToText(hiddenDataBinary);
    }

    const saltBinary = hiddenDataBinary.slice(signatureLength, signatureLength + 128);
    const ivBinary = hiddenDataBinary.slice(signatureLength + 128, signatureLength + 128 + 96);
    const encryptedBinary = hiddenDataBinary.slice(signatureLength + 128 + 96);

    const salt = this.binaryToArrayBuffer(saltBinary);
    const iv = this.binaryToArrayBuffer(ivBinary);
    const encrypted = this.binaryToArrayBuffer(encryptedBinary);
    const password = new TextEncoder().encode(key);

    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: 10000,
        hash: "SHA-256",
      },
      await crypto.subtle.importKey("raw", password, { name: "PBKDF2" }, false, ["deriveKey"]),
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );

    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        derivedKey,
        encrypted
      );
      return new TextDecoder().decode(decrypted);
    } catch (err) {
      throw new Error("Incorrect key or corrupted data");
    }
  }

  // Check if file is a document type
  private static isDocumentType(type: string): boolean {
    const documentTypes = [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    return documentTypes.includes(type);
  }

  // Encode message into document
  private static async encodeDocument(file: File, lengthBinary: string, hiddenDataBinary: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);

        // Check capacity
        const totalBitsNeeded = 32 + hiddenDataBinary.length;
        if (totalBitsNeeded > uint8Array.length) {
          reject(new Error('Message is too long for this document'));
          return;
        }

        // Encode length
        for (let i = 0; i < 32; i++) {
          uint8Array[i] = (uint8Array[i] & 254) | parseInt(lengthBinary[i]);
        }

        // Encode hidden data
        for (let i = 0; i < hiddenDataBinary.length; i++) {
          uint8Array[i + 32] = (uint8Array[i + 32] & 254) | parseInt(hiddenDataBinary[i]);
        }

        const modifiedBlob = new Blob([uint8Array], { type: file.type });
        resolve(modifiedBlob);
      };
      reader.onerror = () => reject(new Error('Failed to load document'));
      reader.readAsArrayBuffer(file);
    });
  }

  // Extract hidden data from document
  private static async extractHiddenDataFromDocument(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);

        // Decode length
        let lengthBinary = '';
        for (let i = 0; i < 32; i++) {
          lengthBinary += (uint8Array[i] & 1).toString();
        }
        const totalLength = parseInt(lengthBinary, 2);

        // Decode hidden data
        let hiddenDataBinary = '';
        for (let i = 32; i < totalLength + 32 && i < uint8Array.length; i++) {
          hiddenDataBinary += (uint8Array[i] & 1).toString();
        }

        resolve(hiddenDataBinary);
      };
      reader.onerror = () => reject(new Error('Failed to load document'));
      reader.readAsArrayBuffer(file);
    });
  }

  // Image encoding
  private static async encodeImage(file: File, lengthBinary: string, hiddenDataBinary: string): Promise<Blob> {
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

        if (hiddenDataBinary.length > data.length - 32) {
          reject(new Error('Message is too long for this image'));
          return;
        }

        for (let i = 0; i < 32; i++) {
          data[i] = (data[i] & 254) | parseInt(lengthBinary[i]);
        }

        for (let i = 0; i < hiddenDataBinary.length; i++) {
          data[i + 32] = (data[i + 32] & 254) | parseInt(hiddenDataBinary[i]);
        }

        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        }, 'image/png');
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      reader.readAsDataURL(file);
    });
  }

  // Image decoding
  private static async extractHiddenDataFromImage(file: File): Promise<string> {
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

        let lengthBinary = '';
        for (let i = 0; i < 32; i++) {
          lengthBinary += (data[i] & 1).toString();
        }
        const totalLength = parseInt(lengthBinary, 2);

        let hiddenDataBinary = '';
        for (let i = 32; i < totalLength + 32 && i < data.length; i++) {
          hiddenDataBinary += (data[i] & 1).toString();
        }

        resolve(hiddenDataBinary);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      reader.readAsDataURL(file);
    });
  }

  // Video encoding
  private static async encodeVideo(file: File, lengthBinary: string, hiddenDataBinary: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);

        if (hiddenDataBinary.length > uint8Array.length - 32) {
          reject(new Error('Message is too long for this video file'));
          return;
        }

        for (let i = 0; i < 32; i++) {
          uint8Array[i] = (uint8Array[i] & 254) | parseInt(lengthBinary[i]);
        }

        for (let i = 0; i < hiddenDataBinary.length; i++) {
          uint8Array[i + 32] = (uint8Array[i + 32] & 254) | parseInt(hiddenDataBinary[i]);
        }

        const modifiedBlob = new Blob([uint8Array], { type: file.type });
        resolve(modifiedBlob);
      };

      reader.onerror = () => reject(new Error('Failed to load video file'));
      reader.readAsArrayBuffer(file);
    });
  }

  // Video decoding
  private static async extractHiddenDataFromVideo(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);

        let lengthBinary = '';
        for (let i = 0; i < 32; i++) {
          lengthBinary += (uint8Array[i] & 1).toString();
        }
        const totalLength = parseInt(lengthBinary, 2);

        let hiddenDataBinary = '';
        for (let i = 32; i < totalLength + 32 && i < uint8Array.length; i++) {
          hiddenDataBinary += (uint8Array[i] & 1).toString();
        }

        resolve(hiddenDataBinary);
      };

      reader.onerror = () => reject(new Error('Failed to load video file'));
      reader.readAsArrayBuffer(file);
    });
  }

  // Audio encoding
  private static async encodeAudio(file: File, lengthBinary: string, hiddenDataBinary: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const audioContext = new AudioContext();
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const audioBuffer = await audioContext.decodeAudioData(e.target?.result as ArrayBuffer);
          const channelData = audioBuffer.getChannelData(0);

          if (hiddenDataBinary.length > channelData.length - 32) {
            reject(new Error('Message is too long for this audio file'));
            return;
          }

          const modifiedBuffer = audioContext.createBuffer(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            audioBuffer.sampleRate
          );
          const modifiedData = modifiedBuffer.getChannelData(0);
          modifiedData.set(channelData);

          for (let i = 0; i < 32; i++) {
            modifiedData[i] = Math.floor(channelData[i] * 1000) / 1000 +
              (parseInt(lengthBinary[i]) * 0.0001);
          }

          for (let i = 0; i < hiddenDataBinary.length; i++) {
            modifiedData[i + 32] = Math.floor(channelData[i + 32] * 1000) / 1000 +
              (parseInt(hiddenDataBinary[i]) * 0.0001);
          }

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
          resolve(wavBlob);
        } catch (err) {
          reject(new Error('Failed to process audio file'));
        }
      };

      reader.onerror = () => reject(new Error('Failed to load audio file'));
      reader.readAsArrayBuffer(file);
    });
  }

  // Audio decoding
  private static async extractHiddenDataFromAudio(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const audioContext = new AudioContext();
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const audioBuffer = await audioContext.decodeAudioData(e.target?.result as ArrayBuffer);
          const channelData = audioBuffer.getChannelData(0);

          let lengthBinary = '';
          for (let i = 0; i < 32; i++) {
            lengthBinary += Math.round((channelData[i] * 10000) % 2);
          }
          const totalLength = parseInt(lengthBinary, 2);

          let hiddenDataBinary = '';
          for (let i = 32; i < totalLength + 32 && i < channelData.length; i++) {
            hiddenDataBinary += Math.round((channelData[i] * 10000) % 2);
          }

          resolve(hiddenDataBinary);
        } catch (err) {
          reject(new Error('Failed to process audio file'));
        }
      };

      reader.onerror = () => reject(new Error('Failed to load audio file'));
      reader.readAsArrayBuffer(file);
    });
  }

  // Helper function to convert AudioBuffer to WAV
  private static bufferToWav(buffer: AudioBuffer): Blob {
    const numOfChannels = buffer.numberOfChannels;
    const length = buffer.length * numOfChannels * 2;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);
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

    const channelData = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < channelData.length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  // Encode message into media with optional key
  static async encode(file: File, message: string, key: string = ''): Promise<Blob> {
    let hiddenDataBinary = key ? await this.encryptMessage(message, key) : this.textToBinary(message);
    const totalLength = hiddenDataBinary.length;
    if (totalLength > 2 ** 31 - 1) {
      throw new Error("Message too long to encode");
    }
    const lengthBinary = totalLength.toString(2).padStart(32, '0');
    if (file.type.startsWith('image/')) {
      return this.encodeImage(file, lengthBinary, hiddenDataBinary);
    } else if (file.type.startsWith('video/')) {
      return this.encodeVideo(file, lengthBinary, hiddenDataBinary);
    } else if (file.type.startsWith('audio/')) {
      return this.encodeAudio(file, lengthBinary, hiddenDataBinary);
    } else if (this.isDocumentType(file.type)) {
      return this.encodeDocument(file, lengthBinary, hiddenDataBinary);
    }
    throw new Error("Unsupported file type");
  }

  // Decode message from media with optional key
  static async decode(file: File, key: string = ''): Promise<string> {
    let hiddenDataBinary: string;
    if (file.type.startsWith('image/')) {
      hiddenDataBinary = await this.extractHiddenDataFromImage(file);
    } else if (file.type.startsWith('video/')) {
      hiddenDataBinary = await this.extractHiddenDataFromVideo(file);
    } else if (file.type.startsWith('audio/')) {
      hiddenDataBinary = await this.extractHiddenDataFromAudio(file);
    } else if (this.isDocumentType(file.type)) {
      hiddenDataBinary = await this.extractHiddenDataFromDocument(file);
    } else {
      throw new Error("Unsupported file type");
    }
    return this.decryptHiddenData(hiddenDataBinary, key);
  }
}