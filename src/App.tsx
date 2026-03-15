/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, getProfile } from './services/db';
import { Loader2 } from 'lucide-react';
import i18n from './i18n';
import Welcome from './pages/Welcome';
const SelectProfile = lazy(() => import('./pages/SelectProfile'));
const ParentalSetup = lazy(() => import('./pages/ParentalSetup'));
const ChooseStyle = lazy(() => import('./pages/ChooseStyle'));
const ChildInterview = lazy(() => import('./pages/ChildInterview'));
const VoiceInterview = lazy(() => import('./pages/VoiceInterview'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const StoryEngine = lazy(() => import('./pages/StoryEngine'));
const MathGate = lazy(() => import('./pages/MathGate'));
const FriendDetails = lazy(() => import('./pages/FriendDetails'));
const StoryDetails = lazy(() => import('./pages/StoryDetails'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const FriendQuestionsInterview = lazy(() => import('./pages/FriendQuestionsInterview'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-wonderland">
    <Loader2 className="animate-spin text-magic-500" size={48} />
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        getProfile().then(p => {
          if (p?.language) i18n.changeLanguage(p.language);
        }).catch(() => {});
      }
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-wonderland">
        <Loader2 className="animate-spin text-magic-500" size={48} />
      </div>
    );
  }

  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Welcome user={user} />} />
          {user ? (
            <>
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/select-profile" element={<SelectProfile />} />
              <Route path="/setup" element={<ParentalSetup />} />
              <Route path="/choose-style" element={<ChooseStyle />} />
              <Route path="/interview" element={<ChildInterview />} />
              <Route path="/voice-interview" element={<VoiceInterview />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/story" element={<StoryEngine />} />
              <Route path="/approve/:id" element={<MathGate />} />
              <Route path="/friend/:id" element={<FriendDetails />} />
              <Route path="/story-view/:id" element={<StoryDetails />} />
              <Route path="/friend-questions" element={<FriendQuestionsInterview />} />
            </>
          ) : (
            <Route path="*" element={<Navigate to="/" replace />} />
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
