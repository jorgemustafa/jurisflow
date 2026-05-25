import { BriefcaseBusiness, CalendarClock, CircleDollarSign, Clock3, FileText, LayoutDashboard, Users, type LucideIcon } from "lucide-react";

type AppModule = {
  name: string;
  path: string;
  icon: LucideIcon;
};

export const appModules: AppModule[] = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Clientes", path: "/clients", icon: Users },
  { name: "Processos", path: "/cases", icon: BriefcaseBusiness },
  { name: "Andamentos", path: "/timeline", icon: Clock3 },
  { name: "Prazos", path: "/deadlines", icon: CalendarClock },
  { name: "Financeiro", path: "/finance", icon: CircleDollarSign },
  { name: "Documentos", path: "/documents", icon: FileText }
];
