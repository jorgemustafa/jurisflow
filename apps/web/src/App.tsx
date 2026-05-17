import { Route, Routes } from "react-router";
import { AuthProvider } from "./features/auth/AuthContext.js";
import { LoginPage } from "./features/auth/LoginPage.js";
import { RequireAuth } from "./features/auth/RequireAuth.js";
import { CasesPage } from "./features/cases/list/CasesPage.js";
import { DashboardPage } from "./features/dashboard/DashboardPage.js";
import { ClientDetailsPage } from "./features/clients/detail/ClientDetailsPage.js";
import { ClientsPage } from "./features/clients/list/ClientsPage.js";
import { CreateClientPage } from "./features/clients/CreateClientPage.js";
import { UpdateClientPage } from "./features/clients/UpdateClientPage.js";
import { FinancePage } from "./features/finance/FinancePage.js";
import { Layout } from "./layout/Layout.js";

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
