// app.tsx
import { useState, useCallback, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { FileUpload } from './components/FileUpload';
import { MediaPreview } from './components/MediaPreview';
import { Login } from './components/Login';
import { Signup } from './components/Signup';
import { ResetPassword } from './components/ResetPassword';
import { SteganographyService } from './lib/steganography';
import {
  Lock,
  Unlock,
  AlertCircle,
  Share2,
  Image,
  Video,
  Music,
  Eye,
  EyeOff,
  User,
  FileText,
} from 'lucide-react';
import { History } from './components/History';
import { Settings } from './components/Setting';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | 'document'>('image');
  const [message, setMessage] = useState('');
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [decodedMessage, setDecodedMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [encodedMediaUrl, setEncodedMediaUrl] = useState<string | null>(null);
  const [encodedBlob, setEncodedBlob] = useState<Blob | null>(null);
  const [currentPage, setCurrentPage] = useState<'main' | 'history' | 'settings' | 'profile'>('main');
  const [username, setUsername] = useState<string | null>(null);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();
      if (error) throw error;
      setUsername(data.username);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setUsername('Unknown');
    }
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResetPassword(true);
        setIsAuthenticated(true);
      } else if (event === 'SIGNED_IN') {
        setIsAuthenticated(true);
        setUser(session?.user ?? null);
        setIsResetPassword(false);
        if (session?.user) {
          fetchProfile(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setUser(null);
        setIsResetPassword(false);
        setUsername(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setUser(session?.user ?? null);
      if (session && window.location.search.includes('type=recovery')) {
        setIsResetPassword(true);
      }
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setUser(null);
    setInputFile(null);
    setMediaPreview(null);
    setMessage('');
    setKey('');
    setDecodedMessage('');
    setError(null);
    setEncodedMediaUrl(null);
    setEncodedBlob(null);
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleSignup = () => {
    setShowSignup(false);
  };

  const handleSwitchToLogin = () => {
    setShowSignup(false);
  };

  const handleSwitchToSignup = () => {
    setShowSignup(true);
  };

  const handleFileSelect = useCallback(
    (file: File) => {
      setInputFile(file);
      if (mediaType !== 'document') {
        const reader = new FileReader();
        reader.onload = (e) => setMediaPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setMediaPreview(null);
      }
      setError(null);
      setEncodedMediaUrl(null);
      setEncodedBlob(null);
      setDecodedMessage('');
      setKey('');
    },
    [mediaType]
  );

  const handleEncode = useCallback(async () => {
    if (!inputFile || (mode === 'encode' && !message)) {
      setError('Please provide a file and, for encoding, a message');
      return;
    }
    try {
      const blob = await SteganographyService.encode(inputFile, message, key);
      const url = URL.createObjectURL(blob);
      setEncodedMediaUrl(url);
      setEncodedBlob(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `encoded-${inputFile.name}`;
      link.click();
      setError(null);
      await supabase.from('history').insert({
        user_id: user.id,
        action: 'encode',
        file_name: inputFile.name,
        message: message,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      setError((err as Error).message);
    }
  }, [inputFile, message, key, mode, user]);

  const handleDecode = useCallback(async () => {
    if (!inputFile) {
      setError('Please provide a file to decode');
      return;
    }
    try {
      const message = await SteganographyService.decode(inputFile, key);
      setDecodedMessage(message);
      setError(null);
      await supabase.from('history').insert({
        user_id: user.id,
        action: 'decode',
        file_name: inputFile.name,
        decoded_message: message,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      setError((err as Error).message);
    }
  }, [inputFile, key, user]);

  const handleShare = useCallback(async () => {
    if (!encodedBlob || !inputFile) return;
    try {
      const file = new File([encodedBlob], `encoded-${inputFile.name}`, { type: encodedBlob.type });
      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: 'Encoded File',
          text: 'File encoded with SilentPixels',
        });
      } else {
        setError('Sharing is not supported on this device');
      }
    } catch (err) {
      setError('Failed to share the file');
    }
  }, [encodedBlob, inputFile]);

  if (isResetPassword) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 text-center">Reset Password</h2>
            <ResetPassword
              onGoToLogin={() => {
                setIsResetPassword(false);
                window.history.replaceState({}, document.title, window.location.pathname);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return showSignup ? (
      <Signup onSignup={handleSignup} onSwitchToLogin={handleSwitchToLogin} />
    ) : (
      <Login onLogin={handleLogin} onSwitchToSignup={handleSwitchToSignup} />
    );
  }

  const displayName = username || 'Loading...';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow py-4 position-fixed">
        <div className="px-4 flex justify-between items-center">
          <div className="flex items-center">
            <img src="./src/public/blue.jpg" alt="Logo" className="w-10 h-10" />
            <img
              src="./src/public/log.png"
              alt="SilentPixels"
              className="ml-2 text-xl w-21 font-bold max-w-[15%]"
            />
          </div>
          <div
  className="relative"
  onMouseEnter={() => setIsProfileOpen(true)}
  onMouseLeave={() => setIsProfileOpen(false)}
>
  <button className="flex items-center gap-2">
    <User className="w-6 h-6 text-gray-600" />
    <span className="text-gray-800">{displayName}</span>
  </button>
  {isProfileOpen && (
    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-10">
      <button
        onClick={() => {
          setCurrentPage('profile');
          setIsProfileOpen(false);
        }}
        className="w-full text-left px-4 py-2 hover:bg-gray-100"
      >
        Profile
      </button>
      <button
        onClick={() => {
          setCurrentPage('history');
          setIsProfileOpen(false);
        }}
        className="w-full text-left px-4 py-2 hover:bg-gray-100"
      >
        View History
      </button>
      <button
        onClick={() => {
          setIsProfileOpen(false);
          setShowChangePassword(true);
        }}
        className="w-full text-left px-4 py-2 hover:bg-gray-100"
      >
        Change Password
      </button>
      <button
        onClick={() => {
          setCurrentPage('settings');
          setIsProfileOpen(false);
        }}
        className="w-full text-left px-4 py-2 hover:bg-gray-100"
      >
        Settings
      </button>
      <button
        onClick={handleLogout}
        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
      >
        Logout
      </button>
    </div>
  )}
</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {currentPage === 'main' && (
          <div className="max-w-[70%] mx-auto p-6 pt-6 ">
            <div className="text-center mb-8">
              <img
                src="./src/public/log1.png"
                alt="SilentPixels"
                className="mx-auto max-w-80 h-auto rounded-lg object-contain mb-4"
              />
              <p id="std" className="text-gray-600">MASKING SECRETS IN MIXEDMEDIA</p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setMode('encode')}
                  className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 ${
                    mode === 'encode' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 border'
                  }`}
                >
                  <Lock className="w-4 h-4" /> Encode
                </button>
                <button
                  onClick={() => setMode('decode')}
                  className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 ${
                    mode === 'decode' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 border'
                  }`}
                >
                  <Unlock className="w-4 h-4" /> Decode
                </button>
              </div>
              <div className="mb-6">
                <div className="flex gap-4 mb-4">
                  <button
                    onClick={() => setMediaType('image')}
                    className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 ${
                      mediaType === 'image' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 border'
                    }`}
                  >
                    <Image className="w-4 h-4" /> Image
                  </button>
                  <button
                    onClick={() => setMediaType('video')}
                    className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 ${
                      mediaType === 'video' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 border'
                    }`}
                  >
                    <Video className="w-4 h-4" /> Video
                  </button>
                  <button
                    onClick={() => setMediaType('audio')}
                    className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 ${
                      mediaType === 'audio' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 border'
                    }`}
                  >
                    <Music className="w-4 h-4" /> Audio
                  </button>
                  <button
                    onClick={() => setMediaType('document')}
                    className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 ${
                      mediaType === 'document' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 border'
                    }`}
                  >
                    <FileText className="w-4 h-4" /> Document
                  </button>
                </div>
                <FileUpload onFileSelect={handleFileSelect} mediaType={mediaType} />
              </div>
              {mediaPreview && mediaType !== 'document' && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Media Preview</h3>
                  <MediaPreview src={mediaPreview} alt="Preview" type={mediaType} />
                </div>
              )}
              {inputFile && mediaType === 'document' && (
                <div className="mb-6">
                  <p>Document selected: {inputFile.name}</p>
                </div>
              )}
              {mode === 'encode' && (
                <div className="mb-6">
                  <label className="block text-gray-700 mb-2">Message to Encode : </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your secret message..."
                    className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="mt-2">
                    <label className="block text-gray-700 mb-2">Encryption Key (optional) : </label>
                    <div className="relative">
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        placeholder="Enter encryption key (optional)"
                        className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {mode === 'decode' && (
                <div className="mb-6">
                  <label className="block text-gray-700 mb-2">Decryption Key (if used during encoding)</label>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={key}
                      onChange={(e) => setKey(e.target.value)}
                      placeholder="Enter decryption key (if encoded with key)"
                      className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              )}
              {error && (
                <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </div>
              )}
              {(mediaType === 'video' || mediaType === 'document') && (
                <div className="mb-6 p-4 bg-yellow-50 rounded-lg flex items-center gap-2 text-yellow-700">
                  <AlertCircle className="w-5 h-5" />
                  Note: {mediaType === 'video' ? 'Video' : 'Document'} steganography may be unreliable due to compression or file structure issues.
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
                  className="flex-1 py-2 px-4 bg-blue-600 max-w-[45%] text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
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
        )}
        {currentPage === 'history' && (
          <History userId={user.id} username={username || 'Unknown'} onBack={() => setCurrentPage('main')} />
        )}
        {currentPage === 'settings' && (
          <Settings user={user} onBack={() => setCurrentPage('main')} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-black text-white py-4 mt-8">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <p>© 2025 SilentPixels. All rights reserved.</p>
          <p className="mt-1">Happy Hiding.</p>
        </div>
      </footer>

      {/* Change Password Modal */}
      {showChangePassword && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowChangePassword(false)}
        >
          <div className="bg-white rounded-lg p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Change Password</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (newPassword !== confirmPassword) {
                  setPasswordError('Passwords do not match');
                  return;
                }
                try {
                  const { error } = await supabase.auth.updateUser({ password: newPassword });
                  if (error) throw error;
                  setShowChangePassword(false);
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordError(null);
                  alert('Password updated successfully');
                } catch (err) {
                  setPasswordError((err as Error).message);
                }
              }}
            >
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              {passwordError && <p className="text-red-600 mb-4">{passwordError}</p>}
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Update Password
                </button>
                <button
                  type="button"
                  onClick={() => setShowChangePassword(false)}
                  className="py-2 px-4 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
