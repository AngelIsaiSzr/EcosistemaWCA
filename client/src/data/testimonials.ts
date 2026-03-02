import { InsertTestimonial } from '@shared/schema';

// Initial testimonials data for seeding the application
export const initialTestimonials: InsertTestimonial[] = [
  {
    name: "Alejandra Guzmán",
    courseName: "Desarrollo Web Frontend",
    image: "https://randomuser.me/api/portraits/women/45.jpg",
    text: "Gracias al Ecosistema WCA pude aprender a programar desde cero y conseguir mi primer trabajo como desarrolladora frontend. El apoyo constante de los instructores fueron clave para mi éxito.",
    rating: 5,
    order: 1
  },
  {
    name: "Miguel Ángel Hernández",
    courseName: "Python Fullstack",
    image: "https://randomuser.me/api/portraits/men/36.jpg",
    text: "Lo que más valoro de Ecosistema WCA es la calidad del contenido y la pasión de los instructores. He tomado varios programas en línea, pero ninguno con el nivel que ofrecen aquí.",
    rating: 5,
    order: 2
  },
  {
    name: "Daniela Ortiz",
    courseName: "Java Fullstack",
    image: "https://randomuser.me/api/portraits/women/22.jpg",
    text: "Empecé sin conocimientos previos y ahora estoy desarrollando aplicaciones Android. La comunidad de estudiantes y el enfoque práctico de los programas hacen que aprender programación sea increíble.",
    rating: 5,
    order: 3
  },
  {
    name: "Roberto Sánchez",
    courseName: "React & Redux",
    image: "https://randomuser.me/api/portraits/men/42.jpg",
    text: "El programa de React & Redux me permitió actualizar mis conocimientos y dar el salto a tecnologías modernas de frontend. Ahora trabajo en una startup y aplico diariamente lo que aprendí en Ecosistema WCA.",
    rating: 4,
    order: 4
  },
  {
    name: "Lucía Ramírez",
    courseName: "Angular Avanzado",
    image: "https://randomuser.me/api/portraits/women/65.jpg",
    text: "Siempre me interesó el análisis de datos pero no sabía por dónde empezar. El programa de Ciencia de Datos me dio una base sólida y ahora trabajo como analista de datos en una empresa de tecnología financiera.",
    rating: 5,
    order: 5
  },
  {
    name: "Eduardo Torres",
    courseName: "Node.js & Express",
    image: "https://randomuser.me/api/portraits/men/67.jpg",
    text: "La claridad con la que se explican los conceptos complejos es impresionante. En poco tiempo pude desarrollar mi primera API y entender cómo funcionan las aplicaciones en tiempo real.",
    rating: 4,
    order: 6
  }
];
