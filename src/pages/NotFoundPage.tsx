import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui';

export function NotFoundPage() {
  return (
    <EmptyState title="Page not found" icon="🔍">
      <p>This page does not exist. <Link to="/">Go to the dashboard</Link>.</p>
    </EmptyState>
  );
}
