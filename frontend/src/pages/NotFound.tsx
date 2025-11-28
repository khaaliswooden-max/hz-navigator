import { Link, useNavigate } from 'react-router-dom';

function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center animate-in px-4">
      <div className="text-center max-w-lg">
        {/* Illustration */}
        <div className="relative mb-8">
          <svg
            className="w-64 h-48 mx-auto text-hubzone-100"
            viewBox="0 0 400 300"
            fill="none"
          >
            {/* Background shape */}
            <ellipse cx="200" cy="250" rx="150" ry="30" className="fill-gray-100" />
            
            {/* Building */}
            <rect x="120" y="80" width="160" height="170" rx="8" className="fill-hubzone-100" />
            <rect x="140" y="100" width="40" height="50" rx="4" className="fill-hubzone-200" />
            <rect x="200" y="100" width="60" height="30" rx="4" className="fill-hubzone-200" />
            <rect x="200" y="140" width="60" height="30" rx="4" className="fill-hubzone-200" />
            <rect x="140" y="180" width="120" height="70" rx="4" className="fill-hubzone-200" />
            
            {/* Door with X */}
            <rect x="175" y="200" width="50" height="50" rx="4" className="fill-hubzone-300" />
            <path d="M185 220 L215 240 M215 220 L185 240" className="stroke-hubzone-500" strokeWidth="4" strokeLinecap="round" />
            
            {/* Floating 404 */}
            <text x="200" y="60" textAnchor="middle" className="fill-hubzone-600 text-5xl font-bold" style={{ fontFamily: 'Merriweather, serif' }}>
              404
            </text>
            
            {/* Question marks */}
            <text x="90" y="120" className="fill-hubzone-300 text-2xl">?</text>
            <text x="310" y="100" className="fill-hubzone-300 text-3xl">?</text>
            <text x="330" y="180" className="fill-hubzone-200 text-xl">?</text>
          </svg>
        </div>

        {/* Message */}
        <h1 className="text-3xl font-display font-bold text-gray-900 mb-3">
          Page Not Found
        </h1>
        <p className="text-gray-600 mb-8 text-lg">
          Oops! The page you're looking for doesn't exist or may have been moved.
          Let's get you back on track.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/dashboard" className="btn-primary w-full sm:w-auto">
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Go to Dashboard
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary w-full sm:w-auto"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Go Back
          </button>
          <Link to="/check" className="btn-ghost w-full sm:w-auto">
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            HUBZone Check
          </Link>
        </div>

        {/* Help text */}
        <p className="mt-8 text-sm text-gray-500">
          Need help?{' '}
          <a href="mailto:support@hubzone.gov" className="link">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}

export default NotFound;
