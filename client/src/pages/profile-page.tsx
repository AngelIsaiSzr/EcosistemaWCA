import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Redirect, Link, useLocation } from "wouter";
import { Loader2, BookOpen, Award, AlertTriangle, Trash2, Upload, ArrowLeft, User, Camera, Save } from "lucide-react";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/layout/user-avatar";
import { useRef, useState, useEffect } from "react";

const profileSchema = z.object({
  name: z.string().min(2, {
    message: "El nombre debe tener al menos 2 caracteres.",
  }),
  email: z.string().email({
    message: "Por favor ingresa un correo electrónico válido.",
  }),
  username: z.string().min(3, {
    message: "El nombre de usuario debe tener al menos 3 caracteres.",
  }),
  bio: z.string().optional(),
  profileImage: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(6, {
    message: "La contraseña actual debe tener al menos 6 caracteres.",
  }),
  newPassword: z.string().min(6, {
    message: "La nueva contraseña debe tener al menos 6 caracteres.",
  }),
  confirmPassword: z.string().min(6, {
    message: "La confirmación de la contraseña debe tener al menos 6 caracteres.",
  }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

// Define type for enrollments with program data
interface EnrollmentWithProgram {
  id: number;
  userId: number;
  courseId: number;
  progress: number;
  completed: boolean;
  createdAt: string | null;
  program: {
    id: number;
    title: string;
    slug: string;
    description: string;
    shortDescription: string;
    level: string;
    category: string;
    image: string;
    duration: number;
  };
}

export default function ProfilePage() {
  const { user, isLoading, logout } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [, setLocation] = useLocation();
  
  // Fetch user's course enrollments
  const { 
    data: enrollments, 
    isLoading: isLoadingEnrollments,
    refetch: refetchEnrollments
  } = useQuery<EnrollmentWithProgram[]>({ 
    queryKey: ["/api/enrollments"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: Boolean(user),
  });
  
  // Mutation to unenroll from a program
  const unenrollMutation = useMutation({
    mutationFn: async (enrollmentId: number) => {
      const response = await apiRequest("DELETE", `/api/enrollments/${enrollmentId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al cancelar inscripción");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Éxito", 
        description: "Has cancelado tu inscripción al programa",
      });
      // Refetch enrollments to update the UI
      refetchEnrollments();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Prevent accidental navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);
    
  // Handle navigation attempt
  const handleNavigationAttempt = (to: string) => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
      return false;
    }
    setLocation(to);
    return true;
  };

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      username: user?.username || "",
      bio: user?.bio || "",
      profileImage: user?.profileImage || "",
    },
  });

  // Observar cambios en el formulario
  useEffect(() => {
    const subscription = profileForm.watch((value, { name, type }) => {
      // Si hay algún cambio en cualquier campo, marcar como no guardado
      const formValues = profileForm.getValues();
      const hasChanges = 
        formValues.name !== user?.name ||
        formValues.email !== user?.email ||
        formValues.username !== user?.username ||
        formValues.bio !== user?.bio ||
        imagePreview !== null;  // También considerar cambios en la imagen

      // Si hay cambios, actualizar el estado
      if (hasChanges) {
        setHasUnsavedChanges(true);
      } else {
        setHasUnsavedChanges(false);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [profileForm.watch, user, imagePreview]);

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onProfileSubmit = (data: ProfileFormValues) => {
    // Asegurarnos de que los datos incluyan la imagen si hay una pendiente
    if (imagePreview) {
      data.profileImage = imagePreview;
    }
    updateProfileMutation.mutate(data, {
      onSuccess: () => {
        setHasUnsavedChanges(false);
        setImagePreview(null);
      }
    });
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    try {
      const res = await apiRequest("PATCH", "/api/user/password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      
      if (res.ok) {
        toast({
          title: "Contraseña actualizada",
          description: "Tu contraseña ha sido actualizada exitosamente.",
        });
        passwordForm.reset();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error al actualizar la contraseña");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Ocurrió un error",
        variant: "destructive",
      });
    }
  };

  // Mutation to update profile
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: ProfileFormValues) => {
      const response = await apiRequest("PATCH", "/api/user/profile", profileData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al actualizar el perfil");
      }
      return response.json();
    },
    onSuccess: (updatedUser) => {
      // Actualizar el estado del usuario
      queryClient.setQueryData(["/api/user"], updatedUser);
      
      // Actualizar el estado del formulario
      profileForm.reset({
        name: updatedUser.name,
        email: updatedUser.email,
        username: updatedUser.username,
        bio: updatedUser.bio,
        profileImage: updatedUser.profileImage,
      });
      
      // Limpiar estados
      setHasUnsavedChanges(false);
      setImagePreview(null);
      setPendingImageFile(null);
      
      toast({
        title: "¡Perfil actualizado!",
        description: "Los cambios han sido guardados exitosamente.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al guardar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to delete account
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/user");
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Error al eliminar la cuenta" }));
        throw new Error(errorData.message || "Error al eliminar la cuenta");
      }
      // No intentamos parsear la respuesta como JSON si es exitosa
      return null;
    },
    onSuccess: () => {
      toast({
        title: "Cuenta eliminada",
        description: "Tu cuenta ha sido eliminada exitosamente.",
      });
      logout();
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Efecto para manejar el scroll cuando el diálogo está abierto
  useEffect(() => {
    if (showUnsavedDialog) {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '0px'; // Prevenir el salto
      document.body.classList.add('dialog-open');
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.body.classList.remove('dialog-open');
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.body.classList.remove('dialog-open');
    };
  }, [showUnsavedDialog]);

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Verificar el tamaño de la imagen (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: "Error",
        description: "La imagen no debe superar los 5MB",
        variant: "destructive",
      });
      return;
    }

    // Verificar el tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Solo se permiten imágenes en formato JPG, PNG o GIF",
        variant: "destructive",
      });
      return;
    }

    // Crear un canvas para recortar la imagen
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        canvas.width = size;
        canvas.height = size;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Calcular las coordenadas para recortar desde el centro
        const offsetX = (img.width - size) / 2;
        const offsetY = (img.height - size) / 2;
        
        // Dibujar la imagen recortada en el canvas
        ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, size, size);
        
        // Convertir el canvas a una URL de datos
        const base64String = canvas.toDataURL('image/jpeg', 0.8);
        setImagePreview(base64String);
        setHasUnsavedChanges(true);
      };
    };

    reader.readAsDataURL(file);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return (
    <>
      <AlertDialog 
        open={showUnsavedDialog} 
        onOpenChange={setShowUnsavedDialog}
      >
        <AlertDialogContent 
          className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-[90vw] max-w-[500px] p-6 z-50"
          style={{ margin: 0 }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Cambios sin guardar</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes cambios sin guardar. ¿Estás seguro de que quieres salir sin guardar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setShowUnsavedDialog(false)}
              className="mt-0"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setHasUnsavedChanges(false);
                setShowUnsavedDialog(false);
                window.history.back();
              }}
            >
              Salir sin guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Tu Perfil</h1>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => handleNavigationAttempt("/")}
          >
            <ArrowLeft className="h-4 w-4" />
            Regresar al inicio
        </Button>
      </div>
      
      <div className="grid gap-8 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Foto de Perfil</CardTitle>
            <CardDescription>
              Actualiza tu imagen de perfil aquí.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6">
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
              <div className="flex flex-col items-center space-y-6">
                <div className="relative group">
                  <Avatar className="h-32 w-32">
                    <AvatarImage 
                      src={imagePreview || user.profileImage || undefined} 
                      alt={user.name} 
                    />
                    <AvatarFallback className="text-3xl">
                      {user.name ? user.name.charAt(0).toUpperCase() : <User />}
                    </AvatarFallback>
                  </Avatar>
                  <div 
                    className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-8 w-8 text-white" />
                  </div>
                </div>
                
                <label htmlFor="file-upload" className="hidden">
                  Selecciona una imagen
                </label>
                <input 
                  ref={fileInputRef}
                  id="file-upload"
                  type="file" 
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                
                <Button 
                  type="button"
                  variant="outline" 
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  Cambiar foto
                </Button>
                
                <div className="w-full space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bio">Biografía</Label>
                    <Textarea
                      id="bio"
                      placeholder="Escribe algo sobre ti..."
                      className="resize-none min-h-[100px]"
                      {...profileForm.register("bio")}
                    />
                    {profileForm.formState.errors.bio && (
                      <p className="text-sm font-medium text-destructive">{profileForm.formState.errors.bio.message}</p>
                    )}
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="gap-2 w-full"
                    disabled={updateProfileMutation.isPending}
                >
                    {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Guardar perfil
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
              <CardDescription>
                Actualiza tus datos personales aquí.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Completo</Label>
                  <Input 
                    id="name" 
                    {...profileForm.register("name")} 
                  />
                  {profileForm.formState.errors.name && (
                    <p className="text-sm font-medium text-destructive">{profileForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Nombre de Usuario</Label>
                  <Input 
                    id="username" 
                    {...profileForm.register("username")} 
                  />
                  {profileForm.formState.errors.username && (
                    <p className="text-sm font-medium text-destructive">{profileForm.formState.errors.username.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    {...profileForm.register("email")} 
                  />
                  {profileForm.formState.errors.email && (
                    <p className="text-sm font-medium text-destructive">{profileForm.formState.errors.email.message}</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  disabled={profileForm.formState.isSubmitting}
                  className="mt-6"
                >
                  {profileForm.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar cambios"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Seguridad</CardTitle>
              <CardDescription>
                Cambia tu contraseña aquí.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Contraseña Actual</Label>
                  <Input 
                    id="currentPassword" 
                    type="password" 
                    {...passwordForm.register("currentPassword")} 
                  />
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-sm font-medium text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nueva Contraseña</Label>
                  <Input 
                    id="newPassword" 
                    type="password" 
                    {...passwordForm.register("newPassword")} 
                  />
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-sm font-medium text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    {...passwordForm.register("confirmPassword")} 
                  />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-sm font-medium text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  disabled={passwordForm.formState.isSubmitting}
                  className="mt-6"
                >
                  {passwordForm.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    "Actualizar contraseña"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Mis Programas</CardTitle>
            <CardDescription>
              Visualiza tus programas inscritos y sigue tu progreso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingEnrollments ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-border" />
              </div>
            ) : !enrollments || enrollments.length === 0 ? (
              <div className="border rounded-md p-4 text-center">
                <p className="text-muted-foreground">Aún no estás inscrito en ningún programa.</p>
                <Button className="mt-4" variant="outline" asChild>
                  <Link href="/programs">Explorar programas</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {enrollments.map((enrollment) => (
                  <div 
                    key={enrollment.id} 
                    className="border rounded-lg overflow-hidden flex flex-col md:flex-row"
                  >
                    <div className="w-full md:w-1/4">
                      <img 
                        src={enrollment.program.image} 
                        alt={enrollment.program.title}
                        className="h-40 md:h-full w-full object-cover" 
                      />
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-lg font-semibold mb-1">
                            {enrollment.program.title}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <Badge variant="outline" className="px-2 py-0">
                              {enrollment.program.level}
                            </Badge>
                            <span>•</span>
                            <span className="flex items-center">
                              <BookOpen className="h-3.5 w-3.5 mr-1" />
                              {enrollment.program.duration} horas
                            </span>
                          </div>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-muted-foreground hover:text-destructive"
                              aria-label="Cancelar inscripción"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancelar inscripción</AlertDialogTitle>
                              <AlertDialogDescription>
                                ¿Estás seguro que deseas cancelar tu inscripción de {enrollment.program.title}? 
                                Tu progreso se perderá.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => unenrollMutation.mutate(enrollment.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {unenrollMutation.isPending ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Cancelando...
                                  </>
                                ) : (
                                  "Sí, cancelar inscripción"
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {enrollment.program.shortDescription}
                      </p>
                      
                      <div className="mt-auto">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span>Progreso</span>
                          <span className="font-medium">{enrollment.progress}%</span>
                        </div>
                        <Progress value={enrollment.progress} className="h-2" />
                        
                        <div className="flex justify-between items-center mt-4">
                          {enrollment.completed ? (
                            <div className="flex items-center text-accent-600 dark:text-accent-400">
                              <Award className="h-4 w-4 mr-1" />
                              <span className="text-sm font-medium">Completado</span>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              {enrollment.progress > 0 ? "En progreso" : "No iniciado"}
                            </div>
                          )}
                          
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/programs/${enrollment.program.slug}/learn`}>
                              {enrollment.progress > 0 ? "Continuar" : "Iniciar"} programa
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Administración de Cuenta</h2>
        <Separator className="mb-6" />
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Zona de Peligro</h3>
          <p className="text-red-600/80 dark:text-red-400/80 mb-4">
            Una vez que elimines tu cuenta, no hay vuelta atrás. Por favor, asegúrate de estar seguro.
          </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleteAccountMutation.isPending}>
                  {deleteAccountMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    "Eliminar Cuenta"
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Esto eliminará permanentemente tu cuenta
                    y todos los datos asociados, incluyendo tu progreso en los programas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteAccountMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteAccountMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Eliminando...
                      </>
                    ) : (
                      "Sí, eliminar cuenta"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </>
  );
}