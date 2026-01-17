/**
 * ChainStatusBadge Component
 * 
 * Displays chain status (active, maintenance, inactive) with appropriate badge colors.
 * Shows loading spinner while fetching status from the API.
 * 
 * Usage:
 * - Add to chain selection UI
 * - Add to chain status dashboard
 * - Add to cross-chain swap component
 */

import { Badge, Spinner } from 'react-bootstrap';
import { useChainStatus } from '../hooks/useChainStatus';

const ChainStatusBadge = ({ chainId, className = '' }) => {
  const { status, loading } = useChainStatus(chainId);
  
  // Show loading spinner while fetching status
  if (loading) {
    return (
      <Badge bg="secondary" className={className}>
        <Spinner size="sm" className="me-1" style={{ width: '0.75rem', height: '0.75rem' }} />
        Loading...
      </Badge>
    );
  }
  
  // Get status from the status object or default to 'active'
  // Handle both object format { status: 'active' } and string format 'active'
  const statusValue = status?.status || status || 'active';
  
  // Map status values to Bootstrap badge variants
  const variants = {
    active: 'success',        // Green
    operational: 'success',   // Green (synonym for active)
    maintenance: 'warning',   // Yellow
    degraded: 'warning',      // Yellow (synonym for maintenance)
    inactive: 'danger',       // Red
    offline: 'danger'        // Red (synonym for inactive)
  };
  
  // Map status values to display labels
  const labels = {
    active: 'Active',
    operational: 'Operational',
    maintenance: 'Maintenance',
    degraded: 'Degraded',
    inactive: 'Inactive',
    offline: 'Offline'
  };
  
  // Get badge variant and label, defaulting to 'secondary' and 'Unknown' for unknown statuses
  const badgeVariant = variants[statusValue] || 'secondary';
  // Capitalize first letter of status label
  const statusLabel = labels[statusValue] || (statusValue ? statusValue.charAt(0).toUpperCase() + statusValue.slice(1) : 'Unknown');
  
  return (
    <Badge bg={badgeVariant} className={className}>
      {statusLabel}
    </Badge>
  );
};

export default ChainStatusBadge;

