import { InsertUser } from '@shared/schema';

// Initial users data for seeding the application
export const initialUsers: InsertUser[] = [
  {
    username: 'admin',
    email: 'admin@ecosistemawca.com',
    password: 'admin123456',
    name: 'Administrador',
    role: 'admin',
    profileImage: 'https://randomuser.me/api/portraits/lego/1.jpg',
    bio: 'Administrador principal del Ecosistema WCA.'
  }
];