import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';

export function Layout() {
    return (
        <div className="min-h-screen bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background flex flex-col">
            <Sidebar />
            <Header />
            <main className="ml-64 p-6 animate-in fade-in duration-500 flex-1">
                <Outlet />
            </main>
            <div className="ml-64">
                <Footer />
            </div>
        </div>
    );
}
