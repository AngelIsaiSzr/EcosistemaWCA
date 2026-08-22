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
  },
  {
    username: 'talento',
    email: 'talento@ecosistemawca.com',
    password: 'TalentoWCA2026',
    name: 'Talento y Bienestar',
    role: 'talento',
    profileImage: 'https://raw.githubusercontent.com/AngelIsaiSzr/Resources/refs/heads/main/images/icon-wca.png',
    bio: 'Cuenta de Dirección de Talento y Bienestar (RH) para gestión de integración al equipo.'
  }
];