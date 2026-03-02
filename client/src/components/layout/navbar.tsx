import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, X, LogOut, User } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { UserAvatar } from './user-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  // Handle scroll event to change navbar appearance
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path: string) => {
    return location === path;
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-primary-900 shadow-md' : 'bg-transparent'
        }`}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <div className="accent-blue mr-2">
                <img src="https://raw.githubusercontent.com/AngelIsaiSzr/Resources/refs/heads/main/images/icon-wca.png" alt="Ecosistema WCA" className="w-8 h-8" />
              </div>
              <span className="font-heading font-bold text-xl text-accent-blue" style={{ fontFamily: 'Cocomat Pro, sans-serif' }}>Ecosistema WCA</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            <Link href="/" className={`nav-link text-light ${isActive('/') && 'accent-blue'}`}>
              Inicio
            </Link>
            <Link href="/programs" className={`nav-link text-light ${isActive('/programs') && 'accent-blue'}`}>
              Programas
            </Link>
            <Link href="/about" className={`nav-link text-light ${isActive('/about') && 'accent-blue'}`}>
              Acerca de
            </Link>
            <Link href="/contact" className={`nav-link text-light ${isActive('/contact') && 'accent-blue'}`}>
              Contacto
            </Link>
            <Link href="/editor" className={`nav-link text-light ${isActive('/editor') && 'accent-blue'}`}>
              Editor
            </Link>
          </div>

          {/* Auth Buttons or User Menu */}
          <div className="flex items-center space-x-4">
            <div className="hidden lg:flex items-center gap-2">
              <ThemeToggle />
              {user ? (
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2">
                      <UserAvatar size="sm" />
                      <span className="hidden lg:block">{user.name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56" sideOffset={11} disablePortal>
                    <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <Link href="/profile">
                      <DropdownMenuItem className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        <span>Perfil</span>
                      </DropdownMenuItem>
                    </Link>
                    {user.role === 'admin' && (
                      <Link href="/admin">
                        <DropdownMenuItem className="cursor-pointer">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="mr-2 h-4 w-4"
                          >
                            <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v2.5" />
                            <rect width="8" height="5" x="14" y="17" rx="1" />
                            <path d="M6 8h8" />
                            <path d="M6 12h3" />
                            <path d="m19.2 14.8-3.4 3.4" />
                          </svg>
                          <span>Administración</span>
                        </DropdownMenuItem>
                      </Link>
                    )}
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Cerrar sesión</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Link href="/auth">
                    <Button
                      variant="outline"
                      className="hidden lg:block border-accent-blue text-accent-blue hover:bg-accent-blue hover:text-white"
                    >
                      Iniciar sesión
                    </Button>
                  </Link>
                  <Link href="/auth?tab=register">
                    <Button className="hidden lg:block bg-accent-blue hover:bg-accent-blue hover:opacity-90">
                      Registrarse
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-primary-800 border-primary-700">
                <div className="flex justify-between items-center">
                  <Link href="/" className="flex items-center">
                    <div className="accent-blue mr-2">
                      <img src="https://raw.githubusercontent.com/AngelIsaiSzr/Resources/refs/heads/main/images/icon-wca.png" alt="Ecosistema WCA" className="w-8 h-8" />
                    </div>
                  </Link>
                  <div className="flex items-center space-x-2">
                    <ThemeToggle />
                    <SheetClose asChild className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
                      <Button variant="ghost" size="icon">
                        <X className="!h-5 !w-5" />
                      </Button>
                    </SheetClose>
                  </div>
                </div>

                <div className="mt-8 flex flex-col space-y-4">
                  <SheetClose asChild>
                    <Link href="/" className={`text-xl py-2 ${isActive('/') ? 'accent-blue' : 'text-light'}`}>
                      Inicio
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="/programs" className={`text-xl py-2 ${isActive('/programs') ? 'accent-blue' : 'text-light'}`}>
                      Programas
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="/about" className={`text-xl py-2 ${isActive('/about') ? 'accent-blue' : 'text-light'}`}>
                      Acerca de
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="/contact" className={`text-xl py-2 ${isActive('/contact') ? 'accent-blue' : 'text-light'}`}>
                      Contacto
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="/editor" className={`text-xl py-2 ${isActive('/editor') ? 'accent-blue' : 'text-light'}`}>
                      Editor
                    </Link>
                  </SheetClose>
                </div>

                <div className="mt-8 pt-8 border-t border-primary-700">
                  {user ? (
                    <>
                      <div className="flex items-center mb-4">
                        <UserAvatar size="md" className="mr-3" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{user.name}</p>
                          <p className="text-sm text-muted truncate">{user.email}</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <SheetClose asChild>
                          <Link href="/profile">
                            <Button variant="outline" className="w-full justify-start">
                              <User className="mr-2 h-4 w-4" />
                              Perfil
                            </Button>
                          </Link>
                        </SheetClose>

                        {user.role === 'admin' && (
                          <SheetClose asChild>
                            <Link href="/admin">
                              <Button variant="outline" className="w-full justify-start">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="mr-2 h-4 w-4"
                                >
                                  <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v2.5" />
                                  <rect width="8" height="5" x="14" y="17" rx="1" />
                                  <path d="M6 8h8" />
                                  <path d="M6 12h3" />
                                  <path d="m19.2 14.8-3.4 3.4" />
                                </svg>
                                Administración
                              </Button>
                            </Link>
                          </SheetClose>
                        )}

                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={handleLogout}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Cerrar sesión
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <SheetClose asChild>
                        <Link href="/auth">
                          <Button
                            variant="outline"
                            className="w-full border-accent-blue text-accent-blue hover:bg-accent-blue hover:text-white mb-3"
                          >
                            Iniciar sesión
                          </Button>
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link href="/auth?tab=register">
                          <Button className="w-full bg-accent-blue hover:bg-accent-blue hover:opacity-90">
                            Registrarse
                          </Button>
                        </Link>
                      </SheetClose>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
