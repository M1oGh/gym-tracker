import { useEffect } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { BackgroundLayer, Frame, TabBar } from './components/Layout';
import { FloatingTimer } from './components/Timer/Timer';
import Exercises, { ExerciseDetail } from './pages/Exercises';
import History, { WorkoutDetail } from './pages/History';
import Home from './pages/Home';
import Settings from './pages/Settings';
import Templates, { TemplateEdit } from './pages/Templates';
import WorkoutEditor from './pages/WorkoutEditor';

function Shell() {
  const { pathname } = useLocation();
  const showTabs = ['/', '/history', '/templates', '/exercises'].includes(pathname);
  const onWorkoutScreen = pathname === '/workout' || /^\/history\/[^/]+\/edit$/.test(pathname);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="mx-auto max-w-lg min-h-dvh">
      <BackgroundLayer />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/workout" element={<WorkoutEditor />} />
        <Route path="/history" element={<History />} />
        <Route path="/history/:id" element={<WorkoutDetail />} />
        <Route path="/history/:id/edit" element={<WorkoutEditor />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/templates/:id" element={<TemplateEdit />} />
        <Route path="/exercises" element={<Exercises />} />
        <Route path="/exercises/:id" element={<ExerciseDetail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Home />} />
      </Routes>
      {showTabs && <TabBar />}
      <FloatingTimer onWorkoutScreen={onWorkoutScreen} aboveTabs={showTabs} />
      <Frame />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
