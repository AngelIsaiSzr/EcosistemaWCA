import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { useAuth, loginSchema, registerSchema } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PasswordInput } from "@/components/ui/password-input";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState("login");

  // Set active tab based on URL query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "register") {
      setActiveTab("register");
    }
  }, [location]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Login form
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onLoginSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(data);
  };

  // Register form
  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onRegisterSubmit = (data: z.infer<typeof registerSchema>) => {
    registerMutation.mutate(data);
  };

  if (user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Iniciar Sesión - Ecosistema WCA | Academia Tecnológica Multidisciplinaria y Colaborativa</title>
        <meta 
          name="description" 
          content="Inicia sesión o regístrate en Ecosistema WCA, la academia tecnológica multidisciplinaria y colaborativa 100% gratuita que revoluciona la educación del siglo XXI."
        />
      </Helmet>

      <div className="flex min-h-screen">
        {/* Left Section: Auth Forms */}
        <div className="flex flex-col w-full md:w-1/2 items-center justify-center p-4 md:p-10">
          {/* Back Arrow */}
          <a 
            href="/" 
            className="absolute top-4 left-4 p-2 rounded-full hover:bg-secondary-800 transition-colors duration-200"
            aria-label="Volver al inicio"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="text-foreground"
            >
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </a>

          <div className="mb-8 text-center">
            <a href="/" className="flex items-center justify-center mb-6">
              <div className="accent-blue mr-2">
                <i className="fas fa-code text-2xl"></i>
              </div>
              <span className="font-heading font-bold text-xl">Ecosistema WCA</span>
            </a>
            <h1 className="text-2xl md:text-3xl font-heading font-bold mb-2">Bienvenido</h1>
            <p className="text-muted max-w-md">
              Accede a tu cuenta para comenzar a aprender o regístrate para unirte a nuestra comunidad.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-md">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="register">Crear Cuenta</TabsTrigger>
            </TabsList>

            {/* Login Form */}
            <TabsContent value="login" className="transition-all duration-300 ease-in-out">
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle>Iniciar Sesión</CardTitle>
                  <CardDescription>
                    Ingresa tus credenciales para acceder a tu cuenta.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Correo electrónico</FormLabel>
                            <FormControl>
                              <Input placeholder="tu@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contraseña</FormLabel>
                            <FormControl>
                              <PasswordInput placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full bg-accent-blue hover:bg-accent-blue hover:opacity-90"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Iniciar Sesión
                      </Button>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="flex justify-center">
                  <p className="text-sm text-muted">
                    ¿No tienes una cuenta?{" "}
                    <button onClick={() => {
                        const element = document.querySelector("[data-value='register']") as HTMLElement;
                        if (element) element.click();
                      }} 
                      className="p-0 text-accent-blue underline-effect hover:text-accent-blue bg-transparent border-none cursor-pointer">
                      Regístrate
                    </button>
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Register Form */}
            <TabsContent value="register" className="transition-all duration-300 ease-in-out">
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle>Crear Cuenta</CardTitle>
                  <CardDescription>
                    Únete a nuestra comunidad de aprendizaje.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre completo</FormLabel>
                            <FormControl>
                              <Input placeholder="Tu nombre" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Correo electrónico</FormLabel>
                            <FormControl>
                              <Input placeholder="tu@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre de usuario</FormLabel>
                            <FormControl>
                              <Input placeholder="username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contraseña</FormLabel>
                            <FormControl>
                              <PasswordInput placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirmar contraseña</FormLabel>
                            <FormControl>
                              <PasswordInput placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full bg-accent-blue hover:bg-accent-blue hover:opacity-90"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Crear Cuenta
                      </Button>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="flex justify-center">
                  <p className="text-sm text-muted">
                    ¿Ya tienes una cuenta?{" "}
                    <button onClick={() => {
                        const element = document.querySelector("[data-value='login']") as HTMLElement;
                        if (element) element.click();
                      }} 
                      className="p-0 text-accent-blue underline-effect hover:text-accent-blue bg-transparent border-none cursor-pointer">
                      Iniciar sesión
                    </button>
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Section: Hero */}
        <div className="hidden md:flex md:w-1/2 bg-secondary-900 relative overflow-hidden transition-all duration-300 ease-in-out">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1587620962725-abab7fe55159?ixlib=rb-4.0.3&auto=format&fit=crop&w=1489&q=80')] opacity-10 bg-center bg-cover transition-all duration-300 ease-in-out"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-secondary-900 to-secondary-800 opacity-90 transition-all duration-300 ease-in-out"></div>
          
          <div className="relative z-10 flex flex-col justify-center px-12 w-full">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6">
              Aprende, <span className="accent-blue">Crea</span> y <span className="accent-yellow">Transforma</span><br /> tu FUTURO 100% Gratis
            </h2>
            <p className="text-muted mb-8">
              Ecosistema WCA es una academia tecnológica integral donde conviven cursos de computación, historia, literatura, idiomas, matemáticas, arte digital y más, todos con la tecnología como eje transversal usando presentaciones hasta Realidad Virtual, IA y más.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="text-accent-red mr-4 mt-1">
                  <i className="fas fa-check-circle"></i>
                </div>
                <div>
                  <h3 className="font-medium">Academia Multidisciplinaria</h3>
                  <p className="text-muted text-sm">Cursos de computación, historia, literatura, idiomas, matemáticas, arte digital y más.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="text-accent-blue mr-4 mt-1">
                  <i className="fas fa-check-circle"></i>
                </div>
                <div>
                  <h3 className="font-medium">Colaborativa y Descentralizada</h3>
                  <p className="text-muted text-sm">Abrimos nuestras puertas a otros proyectos educativos y con impacto social.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="text-accent-yellow mr-4 mt-1">
                  <i className="fas fa-check-circle"></i>
                </div>
                <div>
                  <h3 className="font-medium">Metodología Educativa</h3>
                  <p className="text-muted text-sm">Integrando ODS y proyectos que resuelven problemas reales del mundo.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
