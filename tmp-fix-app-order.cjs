const fs = require("fs");
const p = "c:/Users/angel/Downloads/EcosistemaWCA/client/src/App.tsx";
let s = fs.readFileSync(p, "utf8");

// Move soft redirects before /admin/:section
const redirects = `        {/* Compat: Equipo y tarjetas pasaron a Talento */}
        <Route path="/admin/tarjetas/:id/editar">
          {(params) => <SoftRedirect to={\`/talento/tarjetas/\${params.id}/editar\`} />}
        </Route>
        <Route path="/admin/tarjetas">{() => <SoftRedirect to="/talento/tarjetas" />}</Route>
        <Route path="/admin/equipo">{() => <SoftRedirect to="/talento/equipo" />}</Route>

`;

// Remove misplaced redirects block if present after admin dashboard
s = s.replace(
  `\n        {/* Compat: Equipo y tarjetas pasaron a Talento */}
        <Route path="/admin/tarjetas/:id/editar">
          {(params) => <SoftRedirect to={\`/talento/tarjetas/\${params.id}/editar\`} />}
        </Route>
        <Route path="/admin/tarjetas">{() => <SoftRedirect to="/talento/tarjetas" />}</Route>
        <Route path="/admin/equipo">{() => <SoftRedirect to="/talento/equipo" />}</Route>
`,
  "\n",
);

const anchor = `        <RoleProtectedRoute path="/admin/correos" component={AdminEmailAutomationPage} roles={["admin"]} />`;
if (!s.includes(anchor)) {
  console.error("anchor missing");
  process.exit(1);
}
if (!s.includes('path="/talento/equipo"')) {
  console.error("talento equipo route missing");
  process.exit(1);
}
s = s.replace(anchor, redirects + anchor);
fs.writeFileSync(p, s);
console.log("order fixed");
