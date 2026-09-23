const fs = require("fs");
const p = "c:/Users/angel/Downloads/EcosistemaWCA/client/src/pages/admin-card-editor-page.tsx";
let s = fs.readFileSync(p, "utf8");
s = s.replaceAll("/admin/tarjetas", "/talento/tarjetas");
s = s.replace(
  `<Link href="/admin" className="hover:text-foreground">
                        Admin
                      </Link>`,
  `<Link href="/talento" className="hover:text-foreground">
                        Talento
                      </Link>`,
);
fs.writeFileSync(p, s);
console.log("ok");
