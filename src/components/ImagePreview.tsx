import { ImageIcon, Video } from 'lucide-react';

interface MediaPreviewProps {
  src: string | null;
  alt: string;
  type?: 'image' | 'video';
}

export function ImagePreview({ src, alt, type = 'image' }: MediaPreviewProps) {
  if (!src) {
    return (
      <div className="w-full h-64 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
        {type === 'video' ? (
          <Video className="w-12 h-12 text-gray-400" />
        ) : (
          <ImageIcon className="w-12 h-12 text-gray-400" />
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-64 rounded-lg overflow-hidden bg-gray-50">
      {type === 'video' ? (
        <video
          src={src}
          controls
          className="w-full h-full object-contain"
        />
      ) : (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-contain"
        />
      )}
    </div>
  );
}