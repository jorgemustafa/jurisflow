import { BriefcaseBusiness, CircleDollarSign, FileText, LayoutDashboard, Users, type LucideIcon } from "lucide-react";

type AppModule = {
  name: string;
  path: string;
  icon: LucideIcon;
};

export const appModules: AppModule[] = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Clientes", path: "/clients", icon: Users },
  { name: "Processos", path: "/cases", icon: BriefcaseBusiness },
  { name: "Financeiro", path: "/finance", icon: CircleDollarSign },
  { name: "Documentos", path: "/documents", icon: FileText }
];
