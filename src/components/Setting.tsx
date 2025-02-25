import React from 'react';
import { supabase } from '../lib/supabase';

interface SettingsProps {
  user: any;
  onBack: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ user, onBack }) => {
  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    );
    if (!confirmed) return;
  
    try {
      // Delete the user's history records
      const { error: historyError } = await supabase
        .from('history')
        .delete()
        .eq('user_id', user.id);
      if (historyError) throw historyError;
  
      // Delete the user's profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);
      if (profileError) throw profileError;
  
      // Sign out the user
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
  
      alert('Account deleted successfully.');
    } catch (err) {
      alert('Error deleting account: ' + (err as Error).message);
    }
  };

  return (
    <div className="max-w-[70%] mx-auto p-6 pt-6">
      <h2 className="text-2xl font-bold mb-4">Settings</h2>
      <hr className="h-5"> 
        </hr>
      <button
        onClick={handleDeleteAccount}
        className="py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700"
      >
        Delete Account
      </button>
      <button
        onClick={onBack}
        className="ml-4 py-2 px-4 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
      >
        Back
      </button>
    </div>
  );
};
