import React, { useCallback } from 'react';
import { Upload } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  mediaType: 'image' | 'video' | 'audio';
}

export function FileUpload({ onFileSelect, mediaType }: FileUploadProps) {
  const acceptMap = {
    image: 'image/*',
    video: 'video/*',
    audio: 'audio/*'
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  }, [onFileSelect]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  }, [onFileSelect]);

  const fileTypeText = {
    image: 'PNG, JPG, or GIF',
    video: 'MP4 or WebM',
    audio: 'MP3 or WAV'
  };

  return (
    <div
      className="w-full"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <Upload className="w-8 h-8 mb-3 text-gray-400" />
          <p className="mb-2 text-sm text-gray-500">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500">{fileTypeText[mediaType]}</p>
        </div>
        <input
          type="file"
          className="hidden"
          onChange={handleChange}
          accept={acceptMap[mediaType]}
        />
      </label>
    </div>
  );
}