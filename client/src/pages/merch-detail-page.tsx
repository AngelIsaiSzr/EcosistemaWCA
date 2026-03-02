import { Helmet } from "react-helmet";
import { useLocation, Link } from "wouter";
import React, { useState, useEffect } from "react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Star } from "lucide-react";

// Datos de productos de merch
const products = [
  {
    id: 1,
    name: "Playera Ecosistema WCA",
    price: 250.00,
    image: "https://i.ibb.co/Q7VZgWQs/playera1-soj6qu.png",
    gallery: [
        "https://i.ibb.co/Q7VZgWQs/playera1-soj6qu.png",
        "https://i.ibb.co/VPjLYxB/playera2-qkbnua.png",
        "https://i.ibb.co/JRVppW6N/playera3-gbcwvj.png"
    ],
    category: "Ropa",
    description: "Viste el cambio. Con esta playera, no solo llevas nuestro logo, sino nuestro compromiso con la educación accesible para todos.",
    longDescription: "Más que una prenda, es un símbolo de nuestro objetivo y compromiso. Cada compra apoya nuestra misión de combatir el analfabetismo digital y ofrecer educación tecnológica accesible en todo el mundo. Fabricada con materiales de alta calidad para que la lleves con orgullo.",
    inStock: true,
    sizes: ["CH", "M", "G", "XG"],
    colors: ["Negro", "Gris"],
    rating: 5,
    reviews: 2,
    features: [
      "Apoya la educación tecnológica",
      "Símbolo de la comunidad",
      "Calidad que inspira"
    ]
  },
  {
    id: 2,
    name: "Sudadera de la Comunidad",
    price: 300.00,
    image: "https://i.ibb.co/CxD10rL/sudadera1-ysuzwc.png",
    gallery: [
        "https://i.ibb.co/CxD10rL/sudadera1-ysuzwc.png",
        "https://i.ibb.co/YTwynZTJ/sudadera2-nlrpx1.png",
        "https://i.ibb.co/4nG6Lkwd/sudadera3-hemyoj.png"
    ],
    category: "Ropa",
    description: "Perfecta para largas sesiones de código. Representa la colaboración y el apoyo mutuo que nos define como comunidad.",
    longDescription: "Diseñada para la comodidad y la concentración. Esta sudadera es tu compañera ideal para esas noches de proyecto, recordándote que eres parte de una comunidad que aprende y crece junta. Sus materiales resistentes aseguran que te acompañará en muchos desafíos.",
    inStock: false,
    sizes: ["CH", "M", "G", "XG"],
    colors: ["Negro", "Gris", "Azul"],
    rating: 5,
    reviews: 1,
    features: [
      "Fomenta la colaboración",
      "Ideal para codificar",
      "Hecha para durar"
    ]
  }
];

export default function MerchDetailPage() {
  const [, setLocation] = useLocation();
  const productId = parseInt(window.location.pathname.split('/').pop() || '1');
  const product = products.find(p => p.id === productId) || products[0];
  const [selectedImage, setSelectedImage] = useState(product.image);
  const [selectedSize, setSelectedSize] = useState(product.sizes ? product.sizes[0] : "");
  const [selectedColor, setSelectedColor] = useState(product.colors ? product.colors[0] : "");

  useEffect(() => {
    setSelectedImage(product.image);
    setSelectedSize(product.sizes ? product.sizes[0] : "");
    setSelectedColor(product.colors ? product.colors[0] : "");
  }, [product.id]);

  const handleOrder = () => {
    // Abrir WhatsApp con el número de Ecosistema WCA
    let message = `Hola! Me interesa el producto: ${product.name} - $${product.price}`;
    if (selectedSize) message += `\nTalla: ${selectedSize}`;
    if (selectedColor) message += `\nColor: ${selectedColor}`;
    const whatsappUrl = `https://wa.me/+527841100108?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <>
      <Helmet>
        <title>{product.name} - Merch Oficial - Ecosistema WCA</title>
        <meta
          name="description"
          content={product.description}
        />
      </Helmet>

      <div className="flex flex-col min-h-screen">
        <Navbar />

        <main className="flex-grow">
          {/* Breadcrumb */}
          <section className="bg-primary-800 py-20 pb-4 md:pb-4">
            <div className="container mx-auto px-4">
              <div className="flex items-center space-x-2 text-sm">
                <Link href="/merch" className="text-muted hover-accent-blue">
                  Merch
                </Link>
                <span className="text-muted">/</span>
                <span className="text-light">{product.name}</span>
              </div>
            </div>
          </section>

          {/* Product Detail */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Product Image */}
                <div className="space-y-4">
                  <div className="relative">
                    <img
                      src={selectedImage}
                      alt={product.name}
                      className="w-full h-96 lg:h-[500px] object-cover rounded-lg"
                    />
                    <Badge 
                      variant="secondary"
                      className="absolute top-4 right-4"
                    >
                      {product.inStock ? "En Stock" : "Próximamente"}
                    </Badge>
                  </div>
                  {/* Image Gallery */}
                  <div className="grid grid-cols-3 gap-4">
                    {(product.gallery || []).map((img, index) => (
                      <img
                        key={index}
                        src={img}
                        alt={`${product.name} - Vista ${index + 1}`}
                        className={`w-full h-32 object-cover rounded-lg cursor-pointer transition-all ${
                          selectedImage === img
                            ? 'border-2 border-accent-blue shadow-lg'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        onClick={() => setSelectedImage(img)}
                      />
                    ))}
                  </div>
                </div>

                {/* Product Info */}
                <div className="space-y-6">
                  <div>
                    <Badge variant="default" className="mb-3">
                      {product.category}
                    </Badge>
                    <h1 className="text-3xl lg:text-4xl font-heading font-bold mb-2">
                      {product.name}
                    </h1>
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.floor(product.rating)
                                ? "text-yellow-400 fill-current"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-muted text-sm">
                        {product.rating} ({product.reviews} reseñas)
                      </span>
                    </div>
                    <p className="text-2xl font-bold accent-blue mb-4">
                      ${product.price}
                    </p>
                    <p className="text-muted leading-relaxed">
                      {product.longDescription}
                    </p>
                  </div>

                  {/* Product Options */}
                  <div className="space-y-4">
                    {product.sizes && product.sizes.length > 1 && (
                      <div>
                        <h3 className="font-semibold mb-2">Talla:</h3>
                        <div className="flex space-x-2">
                          {product.sizes.map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => setSelectedSize(size)}
                              className={`px-4 py-2 border rounded-md transition-colors ${
                                selectedSize === size
                                  ? "border-accent-blue bg-accent-blue/10 text-accent-blue font-semibold"
                                  : "border-border hover:border-accent-blue"
                              }`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {product.colors && product.colors.length > 1 && (
                      <div>
                        <h3 className="font-semibold mb-2">Color:</h3>
                        <div className="flex space-x-2">
                          {product.colors.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setSelectedColor(color)}
                              className={`px-4 py-2 border rounded-md transition-colors capitalize ${
                                selectedColor === color
                                  ? "border-accent-blue bg-accent-blue/10 text-accent-blue font-semibold"
                                  : "border-border hover:border-accent-blue"
                              }`}
                            >
                              {color}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <div>
                    <h3 className="font-semibold mb-3">Características:</h3>
                    <ul className="space-y-2">
                      {product.features.slice(0, 3).map((feature, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-accent-blue rounded-full"></div>
                          <span className="text-muted">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Order Button */}
                  <div className="pt-1">
                    <Button
                      onClick={handleOrder}
                      disabled={!product.inStock}
                      className="w-full bg-accent-blue hover:bg-accent-blue/90 text-white py-3 text-lg font-medium"
                    >
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      {product.inStock ? "Pedir" : "Próximamente"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
} 