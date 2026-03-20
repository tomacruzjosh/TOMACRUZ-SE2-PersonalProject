import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Building2 } from 'lucide-react';

const COLLEGES_OFFICES = [
  'College of Arts and Sciences',
  'College of Business Administration',
  'College of Computer Studies',
  'College of Education',
  'College of Engineering and Architecture',
  'College of Nursing',
  'College of Law',
  'College of Medicine',
  'School of Graduate Studies',
  'Senior High School',
  'Junior High School',
  'Elementary Department',
  'Administration Office',
  'Registrar',
  'Finance',
  'Human Resources',
  'Other Office'
];

export default function Onboarding() {
  const [selectedCollege, setSelectedCollege] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, refreshAppUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollege) {
      setError('Please select your College or Office.');
      return;
    }

    if (!user) return;

    try {
      setLoading(true);
      setError('');
      
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        college_office: selectedCollege,
        isSetupComplete: true
      });

      await refreshAppUser();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to save your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 border border-slate-100">
        <div className="mx-auto w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-6">
          <Building2 size={32} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2 text-center">Welcome to NEU Library!</h1>
        <p className="text-slate-500 mb-8 text-center">It looks like this is your first time visiting. Please tell us which college or office you belong to.</p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="college" className="block text-sm font-medium text-slate-700 mb-2">
              College / Office
            </label>
            <select
              id="college"
              value={selectedCollege}
              onChange={(e) => setSelectedCollege(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-3"
            >
              <option value="" disabled>Select your college or office</option>
              {COLLEGES_OFFICES.map((college) => (
                <option key={college} value={college}>
                  {college}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !selectedCollege}
            className="w-full bg-indigo-600 text-white font-medium py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  );
}
