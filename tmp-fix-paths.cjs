const fs = require("fs");

function patch(file, fn) {
  let s = fs.readFileSync(file, "utf8");
  s = fn(s);
  fs.writeFileSync(file, s);
  console.log("patched", file);
}

patch("c:/Users/angel/Downloads/EcosistemaWCA/client/src/pages/admin-card-editor-page.tsx", (s) => {
  s = s.replaceAll("/admin/tarjetas", "/talento/tarjetas");
  s = s.replace(
    `<Link href="/admin" className="hover:text-foreground">
                        Admin
                      </Link>`,
    `<Link href="/talento" className="hover:text-foreground">
                        Talento
                      </Link>`,
  );
  return s;
});

patch("c:/Users/angel/Downloads/EcosistemaWCA/client/src/pages/admin-cards-page.tsx", (s) => {
  s = s.replaceAll("/admin/tarjetas", "/talento/tarjetas");
  s = s.replaceAll('user?.role === "admin"', 'user?.role === "talento"');
  s = s.replaceAll('user.role !== "admin"', 'user.role !== "talento"');
  s = s.replaceAll('href="/admin"', 'href="/talento"');
  s = s.replace(
    `                <Link href="/talento" className="hover:text-foreground">
                  Inicio
                </Link>`,
    `                <Link href="/talento" className="hover:text-foreground">
                  Talento
                </Link>`,
  );
  return s;
});
