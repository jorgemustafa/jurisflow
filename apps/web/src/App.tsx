import { Route, Routes } from "react-router";
import { DashboardPage } from "./features/dashboard/DashboardPage.js";
import { ClientDetailsPage } from "./features/clients/detail/ClientDetailsPage.js";
import { ClientsPage } from "./features/clients/list/ClientsPage.js";
import { CreateClientPage } from "./features/clients/CreateClientPage.js";
import { UpdateClientPage } from "./features/clients/UpdateClientPage.js";
import { FinancePage } from "./features/finance/FinancePage.js";
import { Layout } from "./layout/Layout.js";

export const App = () => {
  return (
    <Layout>
      <Routes>
        <Route index element={<DashboardPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/new" element={<CreateClientPage />} />
        <Route path="/clients/:id" element={<ClientDetailsPage />} />
        <Route path="/clients/:id/edit" element={<UpdateClientPage />} />
        <Route path="/finance" element={<FinancePage />} />
      </Routes>
    </Layout>
  );
};
