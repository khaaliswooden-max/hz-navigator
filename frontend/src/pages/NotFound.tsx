import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center animate-in">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-hubzone-200">404</h1>
        <h2 className="text-2xl font-display text-gray-900 mt-4">
          Page Not Found
        </h2>
        <p className="text-gray-600 mt-2 max-w-md mx-auto">
          Sorry, we couldn't find the page you're looking for. It might have
          been moved or doesn't exist.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link to="/" className="btn-primary">
            Go to Dashboard
          </Link>
          <Link to="/check" className="btn-secondary">
            Check HUBZone
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFound;

