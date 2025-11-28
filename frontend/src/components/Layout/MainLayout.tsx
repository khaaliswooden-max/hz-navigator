import { useState, useCallback, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { SkipLinks, A11yAnnouncerProvider, useAnnounce } from '../Common/Accessibility';

/**
 * MainLayout - Primary application layout with semantic HTML and accessibility features
 * 
 * Accessibility features:
 * - Skip links for keyboard navigation
 * - Proper heading hierarchy
 * - Semantic HTML structure
 * - ARIA landmarks
 * - Screen reader announcements on navigation
 */
export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Handle escape key to close sidebar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [sidebarOpen]);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const openSidebar = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  return (
    <A11yAnnouncerProvider>
      {/* Skip Links - First focusable elements for keyboard users */}
      <SkipLinks
        links={[
          { id: 'main-content', label: 'Skip to main content' },
          { id: 'main-navigation', label: 'Skip to navigation' },
          { id: 'search', label: 'Skip to search' },
        ]}
      />

      <div className="min-h-screen bg-gray-50">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm lg:hidden"
            onClick={closeSidebar}
            aria-hidden="true"
          />
        )}

        {/* Sidebar Navigation */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={closeSidebar}
        />

        {/* Main content area */}
        <div className="lg:pl-64 flex flex-col min-h-screen">
          {/* Top navbar/header */}
          <Navbar onMenuClick={openSidebar} />

          {/* Main content - primary landmark */}
          <main
            id="main-content"
            className="flex-1 py-6"
            role="main"
            tabIndex={-1}
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {/* Route content with navigation announcements */}
              <RouteAnnouncer />
              <Outlet />
            </div>
          </main>

          {/* Footer */}
          <footer
            className="mt-auto border-t border-gray-200 bg-white"
            role="contentinfo"
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-federal-500 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold" aria-hidden="true">HZ</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    © {new Date().getFullYear()} HZ Navigator. An SBA HUBZone Program Tool.
                  </p>
                </div>
                
                {/* Footer navigation */}
                <nav aria-label="Footer navigation">
                  <ul className="flex items-center gap-6">
                    <li>
                      <a
                        href="/privacy"
                        className="text-sm text-gray-500 hover:text-gray-900 transition-colors focus:outline-none focus-visible:underline"
                      >
                        Privacy Policy
                      </a>
                    </li>
                    <li>
                      <a
                        href="/terms"
                        className="text-sm text-gray-500 hover:text-gray-900 transition-colors focus:outline-none focus-visible:underline"
                      >
                        Terms of Service
                      </a>
                    </li>
                    <li>
                      <a
                        href="/accessibility"
                        className="text-sm text-gray-500 hover:text-gray-900 transition-colors focus:outline-none focus-visible:underline"
                      >
                        Accessibility
                      </a>
                    </li>
                    <li>
                      <a
                        href="/contact"
                        className="text-sm text-gray-500 hover:text-gray-900 transition-colors focus:outline-none focus-visible:underline"
                      >
                        Contact
                      </a>
                    </li>
                  </ul>
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
    </A11yAnnouncerProvider>
  );
}

/**
 * RouteAnnouncer - Announces page changes to screen readers
 */
function RouteAnnouncer() {
  const location = useLocation();
  const { announce } = useAnnounce();

  useEffect(() => {
    // Map paths to human-readable page names
    const pageNames: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/businesses': 'My Businesses',
      '/employees': 'Employees',
      '/compliance': 'Compliance Dashboard',
      '/compliance/alerts': 'Compliance Alerts',
      '/compliance/reports': 'Compliance Reports',
      '/documents': 'Documents',
      '/check': 'HUBZone Address Check',
      '/map': 'Map Explorer',
      '/certifications': 'Certifications',
      '/verifications': 'Verifications',
      '/agency/goals': 'Goal Tracking',
      '/agency/contracts': 'Contracts',
      '/agency/reports': 'Agency Reports',
      '/agency/analytics': 'Analytics Dashboard',
      '/reports': 'Reports',
      '/users': 'User Management',
      '/audit-log': 'Audit Log',
      '/admin': 'Admin Console',
      '/profile': 'My Profile',
      '/settings': 'Settings',
      '/notifications': 'Notifications',
    };

    const pageName = pageNames[location.pathname] || 'Page';
    
    // Small delay to ensure content has loaded
    const timer = setTimeout(() => {
      announce(`Navigated to ${pageName}`);
    }, 100);

    return () => clearTimeout(timer);
  }, [location.pathname, announce]);

  return null;
}
