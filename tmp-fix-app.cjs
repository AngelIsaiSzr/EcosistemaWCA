const fs = require("fs");
const p = "c:/Users/angel/Downloads/EcosistemaWCA/client/src/App.tsx";
let s = fs.readFileSync(p, "utf8");

const oldBlock = `        <RoleProtectedRoute path="/admin/tarjetas/:id/editar" component={AdminCardEditorPage} roles={["admin"]} />
        <RoleProtectedRoute path="/admin/tarjetas" component={AdminCardsPage} roles={["admin"]} />
        <RoleProtectedRoute path="/admin/correos" component={AdminEmailAutomationPage} roles={["admin"]} />
        <RoleProtectedRoute path="/admin/aliados" component={AdminAlliesPage} roles={["admin"]} />
        <RoleProtectedRoute path="/admin/paises" component={AdminCountriesPage} roles={["admin"]} />
        <RoleProtectedRoute path="/admin/programas/:slug/contenido" component={AdminProgramContentPage} roles={["admin"]} />
        <RoleProtectedRoute path="/admin/:section" component={AdminPage} roles={["admin"]} />
        <RoleProtectedRoute path="/admin" component={AdminDashboardPage} roles={["admin"]} />

        {/* Talento: hub + organigrama + INÉDITO + formularios */}
        <RoleProtectedRoute
          path="/talento/inedito/reto"
          component={TalentoIneditoRetoPage}
          roles={["talento"]}
        />
        <RoleProtectedRoute
          path="/talento/inedito/landing"
          component={TalentoIneditoLandingPage}
          roles={["talento"]}
        />
        <RoleProtectedRoute
          path="/talento/inedito"
          component={TalentoIneditoHubPage}
          roles={["talento"]}
        />
        <RoleProtectedRoute
          path="/talento/organigrama"
          component={TalentoOrganigramaPage}
          roles={["talento"]}
        />
        <RoleProtectedRoute
          path="/talento/formularios/:slug/editar"
          component={TalentoFormEditorPage}
          roles={["talento"]}
        />`;

const newBlock = `        <RoleProtectedRoute path="/admin/correos" component={AdminEmailAutomationPage} roles={["admin"]} />
        <RoleProtectedRoute path="/admin/aliados" component={AdminAlliesPage} roles={["admin"]} />
        <RoleProtectedRoute path="/admin/paises" component={AdminCountriesPage} roles={["admin"]} />
        <RoleProtectedRoute path="/admin/programas/:slug/contenido" component={AdminProgramContentPage} roles={["admin"]} />
        <RoleProtectedRoute path="/admin/:section" component={AdminPage} roles={["admin"]} />
        <RoleProtectedRoute path="/admin" component={AdminDashboardPage} roles={["admin"]} />

        {/* Compat: Equipo y tarjetas pasaron a Talento */}
        <Route path="/admin/tarjetas/:id/editar">
          {(params) => <SoftRedirect to={\`/talento/tarjetas/\${params.id}/editar\`} />}
        </Route>
        <Route path="/admin/tarjetas">{() => <SoftRedirect to="/talento/tarjetas" />}</Route>
        <Route path="/admin/equipo">{() => <SoftRedirect to="/talento/equipo" />}</Route>

        {/* Talento: hub + miembros + organigrama + INÉDITO + formularios */}
        <RoleProtectedRoute
          path="/talento/inedito/reto"
          component={TalentoIneditoRetoPage}
          roles={["talento"]}
        />
        <RoleProtectedRoute
          path="/talento/inedito/landing"
          component={TalentoIneditoLandingPage}
          roles={["talento"]}
        />
        <RoleProtectedRoute
          path="/talento/inedito"
          component={TalentoIneditoHubPage}
          roles={["talento"]}
        />
        <RoleProtectedRoute
          path="/talento/organigrama"
          component={TalentoOrganigramaPage}
          roles={["talento"]}
        />
        <RoleProtectedRoute
          path="/talento/equipo"
          component={TalentoEquipoPage}
          roles={["talento"]}
        />
        <RoleProtectedRoute
          path="/talento/tarjetas/:id/editar"
          component={AdminCardEditorPage}
          roles={["talento"]}
        />
        <RoleProtectedRoute
          path="/talento/tarjetas"
          component={AdminCardsPage}
          roles={["talento"]}
        />
        <RoleProtectedRoute
          path="/talento/formularios/:slug/editar"
          component={TalentoFormEditorPage}
          roles={["talento"]}
        />`;

if (!s.includes(oldBlock)) {
  console.error("old block not found");
  process.exit(1);
}
s = s.replace(oldBlock, newBlock);
fs.writeFileSync(p, s);
console.log("App.tsx ok");
