import { useState } from 'react';
import { clsx } from 'clsx';

interface CheckResult {
  isInHubzone: boolean;
  address: string;
  matchingZones: Array<{
    name: string;
    type: string;
    status: string;
  }>;
}

function HubzoneCheck() {
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock result
    setResult({
      isInHubzone: true,
      address,
      matchingZones: [
        {
          name: 'Census Tract 1234.01',
          type: 'Qualified Census Tract',
          status: 'Active',
        },
      ],
    });

    setIsLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in">
      {/* Page header */}
      <div className="text-center">
        <h1 className="text-3xl font-display text-gray-900">
          HUBZone Address Check
        </h1>
        <p className="mt-2 text-gray-600">
          Enter an address to check if it's located within a HUBZone designated
          area
        </p>
      </div>

      {/* Search form */}
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="address" className="label">
              Business Address
            </label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter full address (e.g., 123 Main St, City, State, ZIP)"
              className="input"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !address.trim()}
            className={clsx(
              'btn-primary w-full',
              isLoading && 'opacity-75 cursor-wait'
            )}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Checking...
              </span>
            ) : (
              'Check HUBZone Status'
            )}
          </button>
        </form>
      </div>

      {/* Result display */}
      {result && (
        <div
          className={clsx(
            'card border-2',
            result.isInHubzone
              ? 'border-verified-500 bg-verified-50'
              : 'border-red-300 bg-red-50'
          )}
        >
          <div className="flex items-start gap-4">
            <div
              className={clsx(
                'w-12 h-12 rounded-full flex items-center justify-center text-2xl',
                result.isInHubzone ? 'bg-verified-100' : 'bg-red-100'
              )}
            >
              {result.isInHubzone ? '✓' : '✗'}
            </div>
            <div className="flex-1">
              <h2
                className={clsx(
                  'text-xl font-semibold',
                  result.isInHubzone ? 'text-verified-800' : 'text-red-800'
                )}
              >
                {result.isInHubzone
                  ? 'This address is in a HUBZone!'
                  : 'This address is not in a HUBZone'}
              </h2>
              <p className="mt-1 text-gray-600">{result.address}</p>

              {result.isInHubzone && result.matchingZones.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    Matching Zone(s):
                  </p>
                  {result.matchingZones.map((zone, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-lg p-3 border border-verified-200"
                    >
                      <p className="font-medium text-gray-900">{zone.name}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="badge-info">{zone.type}</span>
                        <span className="badge-success">{zone.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 flex gap-3">
                {result.isInHubzone && (
                  <a href="/certifications" className="btn-primary text-sm">
                    Start Certification
                  </a>
                )}
                <button
                  onClick={() => setResult(null)}
                  className="btn-secondary text-sm"
                >
                  Check Another Address
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info section */}
      <div className="card bg-gray-50 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          What is a HUBZone?
        </h3>
        <p className="mt-2 text-gray-600 text-sm leading-relaxed">
          HUBZone (Historically Underutilized Business Zone) is an SBA program
          that helps small businesses in urban and rural communities gain
          preferential access to federal procurement opportunities. To qualify,
          your principal office must be in a HUBZone and at least 35% of your
          employees must live in HUBZone areas.
        </p>
        <a href="#" className="link text-sm mt-3 inline-block">
          Learn more about HUBZone certification →
        </a>
      </div>
    </div>
  );
}

export default HubzoneCheck;

