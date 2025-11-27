import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top navbar */}
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        {/* Page content */}
        <main className="flex-1 py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-auto border-t border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-federal-500 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">HZ</span>
                </div>
                <p className="text-sm text-gray-500">
                  © {new Date().getFullYear()} HZ Navigator. An SBA HUBZone Program Tool.
                </p>
              </div>
              <nav className="flex items-center gap-6">
                <a
                  href="#privacy"
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Privacy Policy
                </a>
                <a
                  href="#terms"
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Terms of Service
                </a>
                <a
                  href="#accessibility"
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Accessibility
                </a>
                <a
                  href="#contact"
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Contact
                </a>
              </nav>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                This is an official tool supporting the U.S. Small Business Administration's HUBZone Program.
                HUBZone data is updated regularly from official SBA sources.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

