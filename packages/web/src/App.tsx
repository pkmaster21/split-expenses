import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient.js';
import { AuthProvider } from './lib/auth.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import LoginPage from './pages/LoginPage.js';
import HomePage from './pages/HomePage.js';
import CreateGroupPage from './pages/CreateGroupPage.js';
import JoinPage from './pages/JoinPage.js';
import DashboardPage from './pages/DashboardPage.js';
import SettingsPage from './pages/SettingsPage.js';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/g/:inviteCode" element={<JoinPage />} />
            <Route path="/groups/:id" element={<DashboardPage />} />
            <Route path="/groups/:id/settings" element={<SettingsPage />} />
            <Route path="/create" element={<CreateGroupPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      {import.meta.env.DEV && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}
