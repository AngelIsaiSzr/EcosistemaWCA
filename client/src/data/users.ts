import { InsertUser } from '@shared/schema';

// Initial users data for seeding the application
export const initialUsers: InsertUser[] = [
  {
    username: 'admin',
    email: 'admin@webcodeacademy.com',
    password: 'admin123456', // Contraseña actualizada
    name: 'Administrador',
    role: 'admin',
    profileImage: 'https://randomuser.me/api/portraits/lego/1.jpg',
    bio: 'Administrador principal de Ecosistema WCA.'
  }
];