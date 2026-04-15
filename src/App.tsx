import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import AusruestungszuweisungPage from '@/pages/AusruestungszuweisungPage';
import PersonalPage from '@/pages/PersonalPage';
import WartungsprotokollPage from '@/pages/WartungsprotokollPage';
import AusruestungskatalogPage from '@/pages/AusruestungskatalogPage';
// <custom:imports>
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ActionsProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardOverview />} />
              <Route path="ausruestungszuweisung" element={<AusruestungszuweisungPage />} />
              <Route path="personal" element={<PersonalPage />} />
              <Route path="wartungsprotokoll" element={<WartungsprotokollPage />} />
              <Route path="ausruestungskatalog" element={<AusruestungskatalogPage />} />
              <Route path="admin" element={<AdminPage />} />
              {/* <custom:routes> */}
              {/* </custom:routes> */}
            </Route>
          </Routes>
        </ActionsProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
