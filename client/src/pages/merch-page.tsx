import { Helmet } from "react-helmet";
import { Link } from "wouter";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Datos de productos de merch
const products = [
  {
    id: 1,
    name: "Playera Ecosistema WCA",
    price: 300.00,
    image: "https://i.ibb.co/Q7VZgWQs/playera1-soj6qu.png",
    category: "Ropa",
    description: "Viste el cambio. Con esta playera, no solo llevas nuestro logo, sino nuestro compromiso con la educación accesible para todos.",
    inStock: true
  },
  {
    id: 2,
    name: "Sudadera de la Comunidad",
    price: 350.00,
    image: "https://i.ibb.co/CxD10rL/sudadera1-ysuzwc.png",
    category: "Ropa",
    description: "Perfecta para largas sesiones de código. Representa la colaboración y el apoyo mutuo que nos define como comunidad.",
    inStock: false
  }
];

export default function MerchPage() {
  return (
    <>
      <Helmet>
        <title>Merch Oficial - Ecosistema WCA</title>
        <meta
          name="description"
          content="Descubre nuestra colección oficial de merch: camisetas, hoodies, tazas y más productos con el diseño de Ecosistema WCA"
        />
      </Helmet>

      <div className="flex flex-col min-h-screen">
        <Navbar />

        <main className="flex-grow">
          {/* Hero Section */}
          <section className="bg-gradient-to-r from-primary-900 to-secondary-900 py-20 pb-4 md:pb-4">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <h1 className="text-4xl md:text-5xl font-heading font-bold mt-6 mb-4">
                  Merch Oficial
                </h1>
                <p className="text-muted text-lg">
                  Lleva contigo al Ecosistema WCA con nuestra colección exclusiva de productos
                </p>
              </div>
            </div>
          </section>

          {/* Products Grid */}
          <section className="py-12">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.map((product) => (
                  <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                    <CardHeader className="p-0">
                      <div className="relative">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-64 object-cover"
                        />
                        <Badge 
                          variant="secondary"
                          className="absolute top-4 right-4 text-white border-0"
                        >
                          {product.inStock ? "En Stock" : "Próximamente"}
                        </Badge>
                        <Badge className="absolute top-4 left-4 bg-accent-blue text-white border-0 hover:bg-accent-blue/90">
                          {product.category}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-heading font-semibold mb-2">{product.name}</h3>
                      <p className="text-muted mb-4 overflow-hidden text-ellipsis display-webkit-box -webkit-line-clamp-2 -webkit-box-orient-vertical">{product.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold accent-blue">${product.price}</span>
                        <Link href={`/merch/${product.id}`}>
                          <button className="bg-accent-blue hover:bg-accent-blue/90 text-white px-6 py-2 rounded-md font-medium transition-colors">
                            Ver Detalles
                          </button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
} 