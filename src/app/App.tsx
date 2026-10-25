import { QueryProvider } from './providers/QueryProvider';
import { Router } from './router/Router';

export default function App() {
  return (
    <QueryProvider>
      <Router />
    </QueryProvider>
  );
}
