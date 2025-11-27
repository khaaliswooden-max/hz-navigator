import type { AddressChange, HubzoneResidenceStatus } from '../../types/employee';

interface AddressHistoryProps {
  history: AddressChange[];
  showComplianceNotes?: boolean;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getStatusConfig(status: HubzoneResidenceStatus): {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
} {
  switch (status) {
    case 'resident':
      return {
        label: 'HUBZone Resident',
        color: 'text-verified-700',
        bgColor: 'bg-verified-50',
        borderColor: 'border-verified-200',
        icon: (
          <svg className="w-4 h-4 text-verified-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
    case 'non_resident':
      return {
        label: 'Non-HUBZone',
        color: 'text-amber-700',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        icon: (
          <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
      };
    case 'pending_verification':
      return {
        label: 'Pending Verification',
        color: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: (
          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
    default:
      return {
        label: 'Unknown',
        color: 'text-gray-700',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        icon: (
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
  }
}

function getStatusChangeImpact(
  prevStatus: HubzoneResidenceStatus | null,
  currentStatus: HubzoneResidenceStatus
): { type: 'positive' | 'negative' | 'neutral'; message: string } | null {
  if (!prevStatus) return null;
  
  if (prevStatus === 'non_resident' && currentStatus === 'resident') {
    return {
      type: 'positive',
      message: 'Employee became a HUBZone resident. This improves your compliance percentage.',
    };
  }
  
  if (prevStatus === 'resident' && currentStatus === 'non_resident') {
    return {
      type: 'negative',
      message: 'Employee moved out of HUBZone. This may impact your compliance percentage.',
    };
  }
  
  return null;
}

export default function AddressHistory({
  history,
  showComplianceNotes = true,
}: AddressHistoryProps) {
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-xl">
        <svg
          className="mx-auto h-12 w-12 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <p className="mt-2 text-sm text-gray-500">No address history available</p>
      </div>
    );
  }

  // Sort history by effective date (newest first)
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
  );

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {sortedHistory.map((change, index) => {
          const statusConfig = getStatusConfig(change.hubzoneStatus);
          const prevStatus = index < sortedHistory.length - 1 
            ? sortedHistory[index + 1].hubzoneStatus 
            : null;
          const impact = showComplianceNotes 
            ? getStatusChangeImpact(prevStatus, change.hubzoneStatus)
            : null;
          const isLatest = index === 0;
          const isCurrent = !change.endDate;

          return (
            <li key={change.id}>
              <div className="relative pb-8">
                {/* Timeline connector */}
                {index !== sortedHistory.length - 1 && (
                  <span
                    className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                )}

                <div className="relative flex items-start gap-4">
                  {/* Timeline dot */}
                  <div className={`relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ring-4 ring-white ${
                    isLatest ? statusConfig.bgColor : 'bg-gray-100'
                  }`}>
                    {isLatest ? statusConfig.icon : (
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className={`p-4 rounded-xl border ${
                      isLatest ? statusConfig.borderColor + ' ' + statusConfig.bgColor : 'border-gray-200 bg-white'
                    }`}>
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            statusConfig.bgColor} ${statusConfig.color} border ${statusConfig.borderColor}`
                          }>
                            {statusConfig.icon}
                            {statusConfig.label}
                          </span>
                          {isCurrent && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-hubzone-100 text-hubzone-700 border border-hubzone-200">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {formatDate(change.effectiveDate)}
                          </p>
                          {change.endDate && (
                            <p className="text-xs text-gray-500">
                              to {formatDate(change.endDate)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Address */}
                      <address className="not-italic text-sm text-gray-700 mb-2">
                        <p className="font-medium">{change.address.street1}</p>
                        {change.address.street2 && <p>{change.address.street2}</p>}
                        <p>
                          {change.address.city}, {change.address.state} {change.address.zipCode}
                        </p>
                      </address>

                      {/* HUBZone Type */}
                      {change.hubzoneType && (
                        <p className="text-xs text-gray-500 mb-2">
                          Zone Type: <span className="font-medium">{change.hubzoneType}</span>
                        </p>
                      )}

                      {/* Verification */}
                      {change.verifiedAt && (
                        <p className="text-xs text-gray-500">
                          <svg className="inline-block w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Verified on {formatDate(change.verifiedAt)}
                        </p>
                      )}

                      {/* Notes */}
                      {change.notes && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-600">{change.notes}</p>
                        </div>
                      )}

                      {/* Compliance Impact */}
                      {impact && (
                        <div className={`mt-3 p-2 rounded-lg text-xs ${
                          impact.type === 'positive' 
                            ? 'bg-verified-100 text-verified-700'
                            : impact.type === 'negative'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          <div className="flex items-start gap-2">
                            {impact.type === 'positive' ? (
                              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                              </svg>
                            )}
                            <span className="font-medium">{impact.message}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export { AddressHistory };

