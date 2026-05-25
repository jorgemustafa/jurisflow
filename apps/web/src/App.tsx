import { Route, Routes } from "react-router";
import { AuthProvider } from "src/features/auth/AuthContext.js";
import { LoginPage } from "src/features/auth/LoginPage.js";
import { RequireAuth } from "src/features/auth/RequireAuth.js";
import { CreateCasePage } from "src/features/cases/CreateCasePage.js";
import { CaseDetailsPage } from "src/features/cases/detail/CaseDetailsPage.js";
import { CasesPage } from "src/features/cases/list/CasesPage.js";
import { UpdateCasePage } from "src/features/cases/UpdateCasePage.js";
import { DashboardPage } from "src/features/dashboard/DashboardPage.js";
import { DocumentsPage } from "src/features/documents/DocumentsPage.js";
import { ClientDetailsPage } from "src/features/clients/detail/ClientDetailsPage.js";
import { ClientsPage } from "src/features/clients/list/ClientsPage.js";
import { CreateClientPage } from "src/features/clients/CreateClientPage.js";
import { UpdateClientPage } from "src/features/clients/UpdateClientPage.js";
import { FinancePage } from "src/features/finance/FinancePage.js";
import { TimelinePage } from "src/features/timeline/TimelinePage.js";
import { DeadlinesPage } from "src/features/deadlines/DeadlinesPage.js";
import { Layout } from "src/layout/Layout.js";

export const App = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="*"
          element={
            <RequireAuth>
              <Layout>
                <Routes>
                  <Route index element={<DashboardPage />} />
                  <Route path="/clients" element={<ClientsPage />} />
                  <Route path="/clients/new" element={<CreateClientPage />} />
                  <Route path="/clients/:id" element={<ClientDetailsPage />} />
                  <Route path="/clients/:id/edit" element={<UpdateClientPage />} />
                  <Route path="/clients/:clientId/cases/new" element={<CreateCasePage />} />
                  <Route path="/cases" element={<CasesPage />} />
                  <Route path="/cases/:id" element={<CaseDetailsPage />} />
                  <Route path="/cases/:id/edit" element={<UpdateCasePage />} />
                  <Route path="/timeline" element={<TimelinePage />} />
                  <Route path="/deadlines" element={<DeadlinesPage />} />
                  <Route path="/finance" element={<FinancePage />} />
                  <Route path="/documents" element={<DocumentsPage />} />
                </Routes>
              </Layout>
            </RequireAuth>
          }
        />
      </Routes>
    </AuthProvider>
  );
};
