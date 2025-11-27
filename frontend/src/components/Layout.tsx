import { Outlet, NavLink } from 'react-router-dom';
import { clsx } from 'clsx';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/check', label: 'HUBZone Check', icon: '📍' },
  { to: '/map', label: 'Map Explorer', icon: '🗺️' },
  { to: '/certifications', label: 'Certifications', icon: '📋' },
];

function Layout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-hubzone-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-hubzone-500 to-hubzone-700 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">HZ</span>
              </div>
              <div>
                <h1 className="text-xl font-display font-bold text-gray-900">
                  HZ Navigator
                </h1>
                <p className="text-xs text-gray-500">HUBZone Certification</p>
              </div>
            </NavLink>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    clsx(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-hubzone-100 text-hubzone-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )
                  }
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* User menu placeholder */}
            <div className="flex items-center gap-4">
              <button className="btn-primary text-sm">Sign In</button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} HZ Navigator. HUBZone data provided
              by SBA.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="link text-sm">
                Privacy Policy
              </a>
              <a href="#" className="link text-sm">
                Terms of Service
              </a>
              <a href="#" className="link text-sm">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Layout;

