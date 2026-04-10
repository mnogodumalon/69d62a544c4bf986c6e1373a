import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import { WorkflowPlaceholders } from '@/components/WorkflowPlaceholders';
import AdminPage from '@/pages/AdminPage';
import AusruestungszuweisungPage from '@/pages/AusruestungszuweisungPage';
import PersonalPage from '@/pages/PersonalPage';
import WartungsprotokollPage from '@/pages/WartungsprotokollPage';
import AusruestungskatalogPage from '@/pages/AusruestungskatalogPage';
import PublicFormAusruestungszuweisung from '@/pages/public/PublicForm_Ausruestungszuweisung';
import PublicFormPersonal from '@/pages/public/PublicForm_Personal';
import PublicFormWartungsprotokoll from '@/pages/public/PublicForm_Wartungsprotokoll';
import PublicFormAusruestungskatalog from '@/pages/public/PublicForm_Ausruestungskatalog';

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ActionsProvider>
          <Routes>
            <Route path="public/69d62a2f6a108637ddd7d432" element={<PublicFormAusruestungszuweisung />} />
            <Route path="public/69d62a28bb93020197f8c86d" element={<PublicFormPersonal />} />
            <Route path="public/69d62a2f27cfcd7bad02c882" element={<PublicFormWartungsprotokoll />} />
            <Route path="public/69d62a2e5ffe309d11c11a2d" element={<PublicFormAusruestungskatalog />} />
            <Route element={<Layout />}>
              <Route index element={<><div className="mb-8"><WorkflowPlaceholders /></div><DashboardOverview /></>} />
              <Route path="ausruestungszuweisung" element={<AusruestungszuweisungPage />} />
              <Route path="personal" element={<PersonalPage />} />
              <Route path="wartungsprotokoll" element={<WartungsprotokollPage />} />
              <Route path="ausruestungskatalog" element={<AusruestungskatalogPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Routes>
        </ActionsProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
