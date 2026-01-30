import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import Leads from './pages/Leads';
import Calendar from './pages/Calendar';
import Dashboard from './pages/Dashboard';
import Templates from './pages/Templates';
import Outreach from './pages/Outreach';
import Pipeline from './pages/Pipeline';
import Proposals from './pages/Proposals';
import Observability from './pages/Observability';
import Settings from './pages/Settings';
import Integrations from './pages/Integrations';
import AdminPlans from './pages/AdminPlans';

// Placeholder components for routes not yet implemented
const Placeholder = ({ title }) => (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="p-6 rounded-full bg-white/5 border border-white/10 mb-4">
            <span className="text-4xl">🚧</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
        <p className="text-gray-400 max-w-sm">This module is under construction. Check back in the next sprint.</p>
    </div>
);

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />

                    <Route path="/" element={
                        <ProtectedRoute>
                            <Layout />
                        </ProtectedRoute>
                    }>
                        <Route index element={<Dashboard />} />
                        <Route path="leads" element={<Leads />} />
                        <Route path="calendar" element={<Calendar />} />
                        <Route path="templates" element={<Templates />} />
                        <Route path="outreach" element={<Outreach />} />
                        <Route path="pipeline" element={<Pipeline />} />
                        <Route path="proposals" element={<Proposals />} />
                        <Route path="integrations" element={<Integrations />} />
                        <Route path="observability" element={<Observability />} />
                        <Route path="settings" element={<Settings />} />
                        <Route path="admin" element={<AdminPlans />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
