import { Route, Routes } from "react-router";
import { AuthProvider } from "src/features/auth/AuthContext.js";
import { LoginPage } from "src/features/auth/LoginPage.js";
import { RequireAuth } from "src/features/auth/RequireAuth.js";
import { CasesPage } from "src/features/cases/list/CasesPage.js";
import { DashboardPage } from "src/features/dashboard/DashboardPage.js";
import { ClientDetailsPage } from "src/features/clients/detail/ClientDetailsPage.js";
import { ClientsPage } from "src/features/clients/list/ClientsPage.js";
import { CreateClientPage } from "src/features/clients/CreateClientPage.js";
import { UpdateClientPage } from "src/features/clients/UpdateClientPage.js";
import { FinancePage } from "src/features/finance/FinancePage.js";
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
                  <Route path="/cases" element={<CasesPage />} />
                  <Route path="/finance" element={<FinancePage />} />
                </Routes>
              </Layout>
            </RequireAuth>
          }
        />
      </Routes>
    </AuthProvider>
  );
};
