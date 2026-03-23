import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient.js';
import HomePage from './pages/HomePage.js';
import CreateGroupPage from './pages/CreateGroupPage.js';
import JoinPage from './pages/JoinPage.js';
import DashboardPage from './pages/DashboardPage.js';
import SettingsPage from './pages/SettingsPage.js';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreateGroupPage />} />
          <Route path="/g/:inviteCode" element={<JoinPage />} />
          <Route path="/groups/:id" element={<DashboardPage />} />
          <Route path="/groups/:id/settings" element={<SettingsPage />} />
        </Routes>
      </BrowserRouter>
      {import.meta.env.DEV && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}
