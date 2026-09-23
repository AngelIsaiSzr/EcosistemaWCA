import AdminPage from "./admin-page";

/** Equipo vive en el panel de Talento; reutiliza la UI de gestión de miembros. */
export default function TalentoEquipoPage() {
  return <AdminPage params={{ section: "equipo" }} portal="talento" />;
}
