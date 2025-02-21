// /src/App.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { FileUpload } from './components/FileUpload';
import { MediaPreview } from './components/MediaPreview';
import { Login } from './components/Login';
import { SteganographyService } from './lib/steganography';
import { Lock, Unlock, AlertCircle, Share2, Image, Video, Music, LogOut } from 'lucide-react';

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio'>('image');
  const [message, setMessage] = useState('');
  const [key, setKey] = useState('');
  const [decodedMessage, setDecodedMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [encodedMediaUrl, setEncodedMediaUrl] = useState<string | null>(null);

  // Check auth state on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkSession();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setInputFile(null);
    setMediaPreview(null);
    setMessage('');
    setKey('');
    setDecodedMessage('');
    setError(null);
    setEncodedMediaUrl(null);
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  // Existing handlers (unchanged)
  const handleFileSelect = useCallback((file: File) => {
    setInputFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setMediaPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setError(null);
    setEncodedMediaUrl(null);
    setDecodedMessage('');
    setKey('');
  }, []);

  const handleEncode = useCallback(async () => {
    if (!inputFile || !message) {
      setError('Please provide a media file and a message');
      return;
    }
    try {
      const encodedMedia = await SteganographyService.encode(inputFile, message, key);
      setEncodedMediaUrl(encodedMedia);
      const link = document.createElement('a');
      link.href = encodedMedia;
      link.download = `encoded-${mediaType}.${mediaType === 'video' ? 'mp4' : mediaType === 'audio' ? 'wav' : 'png'}`;
      link.click();
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [inputFile, message, key, mediaType]);

  const handleDecode = useCallback(async () => {
    if (!inputFile) {
      setError('Please provide a media file to decode');
      return;
    }
    try {
      const message = await SteganographyService.decode(inputFile, key);
      setDecodedMessage(message);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [inputFile, key]);

  const handleShare = useCallback(async () => {
    if (!encodedMediaUrl) return;
    try {
      const response = await fetch(encodedMediaUrl);
      const blob = await response.blob();
      const file = new File(
        [blob],
        `encoded-${mediaType}.${mediaType === 'video' ? 'mp4' : mediaType === 'audio' ? 'wav' : 'png'}`,
        { type: mediaType === 'video' ? 'video/mp4' : mediaType === 'audio' ? 'audio/wav' : 'image/png' }
      );
      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: 'Encoded Media',
          text: 'Media encoded with SilentPixels',
        });
      } else {
        setError('Sharing is not supported on this device');
      }
    } catch (err) {
      setError('Failed to share the media file');
    }
  }, [encodedMediaUrl, mediaType]);

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <img
        src="/logo.png"
        alt="Logo"
        className="absolute top-5 left-5 w-20 h-20 object-contain"
      />
      <button
        onClick={handleLogout}
        className="absolute top-5 right-5 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
      >
        <LogOut className="w-4 h-4" /> Logout
      </button>

      <div className="max-w-2xl mx-auto p-6 pt-6">
        <div className="max-w-2xl mx-auto p-6">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">SilentPixels</h1>
            <p className="text-gray-600">Masking Secrets in Mixed Media with LSB</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setMode('encode')}
                className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 ${mode === 'encode' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                <Lock className="w-4 h-4" /> Encode
              </button>
              <button
                onClick={() => setMode('decode')}
                className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 ${mode === 'decode' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                <Unlock className="w-4 h-4" /> Decode
              </button>
            </div>

            <div className="mb-6">
              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => setMediaType('image')}
                  className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 ${mediaType === 'image' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  <Image className="w-4 h-4" /> Image
                </button>
                <button
                  onClick={() => setMediaType('video')}
                  className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 ${mediaType === 'video' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  <Video className="w-4 h-4" /> Video
                </button>
                <button
                  onClick={() => setMediaType('audio')}
                  className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 ${mediaType === 'audio' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  <Music className="w-4 h-4" /> Audio
                </button>
              </div>
              <FileUpload onFileSelect={handleFileSelect} mediaType={mediaType} />
            </div>

            {mediaPreview && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Media Preview</h3>
                <MediaPreview src={mediaPreview} alt="Preview" type={mediaType} />
              </div>
            )}

            {mode === 'encode' && (
              <div className="mb-6">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your secret message..."
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="password"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="Enter encryption key (optional)"
                  className="w-full mt-2 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {mode === 'decode' && (
              <div className="mb-6">
                <input
                  type="password"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="Enter decryption key (if encoded with key)"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            {mode === 'decode' && decodedMessage && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Decoded Message</h3>
                <div className="w-full p-4 bg-gray-50 rounded-lg">
                  <p className="whitespace-pre-wrap">{decodedMessage}</p>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={mode === 'encode' ? handleEncode : handleDecode}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                disabled={!inputFile}
              >
                {mode === 'encode' ? (
                  <>
                    <Lock className="w-4 h-4" /> Encode & Download
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" /> Decode Message
                  </>
                )}
              </button>
              {mode === 'encode' && encodedMediaUrl && (
                <button
                  onClick={handleShare}
                  className="py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;