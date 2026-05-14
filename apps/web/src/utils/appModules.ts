import { BriefcaseBusiness, CircleDollarSign, FileText, Users, type LucideIcon } from "lucide-react";

type AppModule = {
  name: string;
  path: string;
  icon: LucideIcon;
};

export const appModules: AppModule[] = [
  { name: "Clientes", path: "/clients", icon: Users },
  { name: "Processos", path: "#", icon: BriefcaseBusiness },
  { name: "Financeiro", path: "/finance", icon: CircleDollarSign },
  { name: "Documentos", path: "#", icon: FileText }
];
