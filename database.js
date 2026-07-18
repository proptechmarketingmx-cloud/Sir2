// database.js - Data structures and persistence for SIR

const DEFAULT_NODES = [
  {
    id: "node-1",
    tipo: "Persona",
    nombre: "Ana Gómez",
    descripcion: "Especialista en Brokerage y Relaciones Públicas de Lujo.",
    atributos: { cargo: "Directora de Ventas", especialidad: "Residencial AAA" },
    fechaCreacion: "2026-01-10T10:00:00Z",
    estado: "Activo"
  },
  {
    id: "node-2",
    tipo: "Persona",
    nombre: "Ing. Carlos Ruíz",
    descripcion: "Inversionista y desarrollador de infraestructura urbana.",
    atributos: { cargo: "Socio Fundador", especialidad: "Desarrollo Vertical" },
    fechaCreacion: "2025-05-15T10:00:00Z",
    estado: "Activo"
  },
  {
    id: "node-3",
    tipo: "Persona",
    nombre: "Lic. Sofía Peralta",
    descripcion: "Abogada corporativa especializada en transacciones e hipotecas.",
    atributos: { cargo: "Notaria Titular", notaria: "Notaría 45" },
    fechaCreacion: "2025-11-20T10:00:00Z",
    estado: "Activo"
  },
  {
    id: "node-4",
    tipo: "Persona",
    nombre: "Arq. Luis Martínez",
    descripcion: "Diseñador principal y planificador urbano.",
    atributos: { estudio: "LM Arquitectos", estilo: "Sustentable" },
    fechaCreacion: "2026-02-01T10:00:00Z",
    estado: "Activo"
  },
  {
    id: "node-5",
    tipo: "Persona",
    nombre: "Diego Díaz",
    descripcion: "Presidente del capítulo local de la asociación de inmobiliarias.",
    atributos: { cargo: "Presidente", organizacion: "AMPI" },
    fechaCreacion: "2025-03-01T10:00:00Z",
    estado: "Activo"
  },
  {
    id: "node-6",
    tipo: "Empresa",
    nombre: "Inmobiliaria Lux",
    descripcion: "Agencia inmobiliaria premium de cobertura internacional.",
    atributos: { sector: "Bienes Raíces", empleados: "50-100" },
    fechaCreacion: "2025-01-01T10:00:00Z",
    estado: "Activo"
  },
  {
    id: "node-7",
    tipo: "Empresa",
    nombre: "Constructora Delta",
    descripcion: "Contratista general de edificaciones comerciales.",
    atributos: { sector: "Construcción", certificaciones: "ISO 9001" },
    fechaCreacion: "2025-02-10T10:00:00Z",
    estado: "Activo"
  },
  {
    id: "node-8",
    tipo: "Empresa",
    nombre: "Banco Capital",
    descripcion: "Institución financiera con división hipotecaria y de fideicomisos.",
    atributos: { sector: "Finanzas", calificacion: "AAA" },
    fechaCreacion: "2024-08-15T10:00:00Z",
    estado: "Activo"
  },
  {
    id: "node-9",
    tipo: "Asociación",
    nombre: "AMPI",
    descripcion: "Asociación Mexicana de Profesionales Inmobiliarios.",
    atributos: { cobertura: "Nacional", socios: "150" },
    fechaCreacion: "2024-01-01T10:00:00Z",
    estado: "Activo"
  },
  {
    id: "node-10",
    tipo: "Asociación",
    nombre: "Colegio de Arquitectos",
    descripcion: "Colegiado de profesionales del diseño y urbanismo.",
    atributos: { cobertura: "Estatal", agremiados: "80" },
    fechaCreacion: "2024-03-10T10:00:00Z",
    estado: "Activo"
  },
  {
    id: "node-11",
    tipo: "Evento",
    nombre: "Expo Real Estate 2026",
    descripcion: "Congreso internacional de inversión y networking inmobiliario.",
    atributos: { sede: "Centro de Convenciones", periodicidad: "Anual" },
    fechaCreacion: "2026-05-01T10:00:00Z",
    estado: "Activo"
  },
  {
    id: "node-12",
    tipo: "Evento",
    nombre: "Foro Inmobiliario Anual",
    descripcion: "Mesa redonda y conferencias del sector construcción.",
    atributos: { sede: "Hotel Grand", patrocinador: "Banco Capital" },
    fechaCreacion: "2025-10-15T10:00:00Z",
    estado: "Activo"
  },
  {
    id: "node-13",
    tipo: "Proyecto",
    nombre: "Torres del Viento",
    descripcion: "Desarrollo residencial de 3 torres de departamentos de lujo.",
    atributos: { inversion: "$25M USD", avance: "45%" },
    fechaCreacion: "2025-06-01T10:00:00Z",
    estado: "Activo"
  },
  {
    id: "node-14",
    tipo: "Propiedad",
    nombre: "Terreno Valle Poniente",
    descripcion: "Macrolote comercial de 15,000m2 con uso de suelo mixto.",
    atributos: { valor: "$8M USD", estatus_legal: "Escriturado" },
    fechaCreacion: "2025-07-20T10:00:00Z",
    estado: "Activo"
  },
  {
    id: "node-15",
    tipo: "Universidad",
    nombre: "Tec de Monterrey",
    descripcion: "Institución académica con programas de arquitectura y finanzas.",
    atributos: { campus: "Zona Metropolitana", egresados: "Miles" },
    fechaCreacion: "2020-01-01T10:00:00Z",
    estado: "Activo"
  }
];

// Helper to construct recent dates relative to now (assuming current date is around July 2026)
const getDateXMonthsAgo = (months) => {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString();
};

const DEFAULT_RELATIONS = [
  // Ana Gómez trabaja en Inmobiliaria Lux (Trabaja en Empresa = 10, interacción reciente)
  {
    id: "rel-1",
    origen: "node-1",
    destino: "node-6",
    tipo: "TRABAJA_EN",
    pesoInicial: 10,
    confianza: 95,
    estado: "Activo",
    observaciones: "Directora comercial a cargo del portafolio VIP.",
    ultimaInteraccion: getDateXMonthsAgo(1) // 1 mes - 100% peso
  },
  // Carlos Ruíz es socio fundador de Constructora Delta (Socio/Fundador = 20)
  {
    id: "rel-2",
    origen: "node-2",
    destino: "node-7",
    tipo: "ES_SOCIO_DE",
    pesoInicial: 20,
    confianza: 100,
    estado: "Activo",
    observaciones: "Aportó 60% del capital inicial.",
    ultimaInteraccion: getDateXMonthsAgo(3) // 3 meses - 100% peso
  },
  // Luis Martínez colabora con Constructora Delta (Trabaja en Empresa = 10)
  {
    id: "rel-3",
    origen: "node-4",
    destino: "node-7",
    tipo: "COLABORA_CON",
    pesoInicial: 10,
    confianza: 85,
    estado: "Activo",
    observaciones: "Arquitecto externo para diseño de proyectos Delta.",
    ultimaInteraccion: getDateXMonthsAgo(8) // 8 meses - 90% peso (decaimiento)
  },
  // Diego Díaz pertenece a AMPI (Presidente = 18)
  {
    id: "rel-4",
    origen: "node-5",
    destino: "node-9",
    tipo: "PERTENECE_A",
    pesoInicial: 18,
    confianza: 98,
    estado: "Activo",
    observaciones: "Gestión 2025-2027.",
    ultimaInteraccion: getDateXMonthsAgo(2) // 2 meses - 100% peso
  },
  // Ana Gómez pertenece a AMPI (Miembro = 12)
  {
    id: "rel-5",
    origen: "node-1",
    destino: "node-9",
    tipo: "PERTENECE_A",
    pesoInicial: 12,
    confianza: 90,
    estado: "Activo",
    observaciones: "Asociada activa desde hace un año.",
    ultimaInteraccion: getDateXMonthsAgo(1)
  },
  // Luis Martínez pertenece al Colegio de Arquitectos (Miembro = 12, interacción vieja)
  {
    id: "rel-6",
    origen: "node-4",
    destino: "node-10",
    tipo: "PERTENECE_A",
    pesoInicial: 12,
    confianza: 90,
    estado: "Activo",
    observaciones: "Poco activo en juntas generales.",
    ultimaInteraccion: getDateXMonthsAgo(14) // 14 meses - 75% peso (decaimiento)
  },
  // Banco Capital financia Torres del Viento (Financia = 15)
  {
    id: "rel-7",
    origen: "node-8",
    destino: "node-13",
    tipo: "FINANCIA",
    pesoInicial: 15,
    confianza: 95,
    estado: "Activo",
    observaciones: "Crédito puente inmobiliario aprobado.",
    ultimaInteraccion: getDateXMonthsAgo(5)
  },
  // Constructora Delta participa en Torres del Viento (Trabaja/Participa = 10)
  {
    id: "rel-8",
    origen: "node-7",
    destino: "node-13",
    tipo: "PARTICIPA_EN",
    pesoInicial: 10,
    confianza: 90,
    estado: "Activo",
    observaciones: "Constructor principal de la obra física.",
    ultimaInteraccion: getDateXMonthsAgo(2)
  },
  // Carlos Ruíz es propietario de Terreno Valle Poniente (Propietario = 20)
  {
    id: "rel-9",
    origen: "node-2",
    destino: "node-14",
    tipo: "ES_PROPIETARIO_DE",
    pesoInicial: 20,
    confianza: 100,
    estado: "Activo",
    observaciones: "Título de propiedad registrado ante notario.",
    ultimaInteraccion: getDateXMonthsAgo(10) // 10 meses - 90% peso
  },
  // Sofía Peralta (Notario) conoce a Carlos Ruíz (Conocido/Amigo = 6)
  {
    id: "rel-10",
    origen: "node-3",
    destino: "node-2",
    tipo: "CONOCE_A",
    pesoInicial: 6,
    confianza: 80,
    estado: "Activo",
    observaciones: "Ha escriturado varios proyectos comerciales para él.",
    ultimaInteraccion: getDateXMonthsAgo(4)
  },
  // Sofía Peralta conoce a Ana Gómez (Conocido = 4)
  {
    id: "rel-11",
    origen: "node-3",
    destino: "node-1",
    tipo: "CONOCE_A",
    pesoInicial: 4,
    confianza: 85,
    estado: "Activo",
    observaciones: "Ambas coinciden en cierres de preventas.",
    ultimaInteraccion: getDateXMonthsAgo(1)
  },
  // Diego Díaz conoce a Ana Gómez (Amigo/Networking = 6)
  {
    id: "rel-12",
    origen: "node-5",
    destino: "node-1",
    tipo: "CONOCE_A",
    pesoInicial: 6,
    confianza: 90,
    estado: "Activo",
    observaciones: "Colaboraron en la convención regional.",
    ultimaInteraccion: getDateXMonthsAgo(26) // 26 meses - 50% peso o menos (muy antiguo)
  },
  // Ana Gómez asiste a Expo Real Estate 2026 (Participó en Evento = 8)
  {
    id: "rel-13",
    origen: "node-1",
    destino: "node-11",
    tipo: "ASISTE_A",
    pesoInicial: 8,
    confianza: 90,
    estado: "Activo",
    observaciones: "Asistente confirmada como ponente.",
    ultimaInteraccion: getDateXMonthsAgo(1)
  },
  // Diego Díaz asiste a Expo Real Estate 2026 (Participó en Evento = 8)
  {
    id: "rel-14",
    origen: "node-5",
    destino: "node-11",
    tipo: "ASISTE_A",
    pesoInicial: 8,
    confianza: 90,
    estado: "Activo",
    observaciones: "Moderador de panel de discusión.",
    ultimaInteraccion: getDateXMonthsAgo(1)
  },
  // Banco Capital organiza Foro Inmobiliario Anual (Organizador = 14)
  {
    id: "rel-15",
    origen: "node-8",
    destino: "node-12",
    tipo: "ORGANIZA",
    pesoInicial: 14,
    confianza: 95,
    estado: "Activo",
    observaciones: "Patrocinador principal y creador del foro.",
    ultimaInteraccion: getDateXMonthsAgo(9) // 9 meses - 90% peso
  },
  // Carlos Ruíz asiste a Foro Inmobiliario Anual (Participó = 8)
  {
    id: "rel-16",
    origen: "node-2",
    destino: "node-12",
    tipo: "ASISTE_A",
    pesoInicial: 8,
    confianza: 85,
    estado: "Activo",
    observaciones: "Invitado a la mesa directiva.",
    ultimaInteraccion: getDateXMonthsAgo(9)
  },
  // Carlos Ruíz egresó del Tec de Monterrey (Participa/Miembro = 12, muy antiguo)
  {
    id: "rel-17",
    origen: "node-2",
    destino: "node-15",
    tipo: "PERTENECE_A",
    pesoInicial: 12,
    confianza: 100,
    estado: "Activo",
    observaciones: "Ex-alumno distinguido (EXATEC).",
    ultimaInteraccion: getDateXMonthsAgo(36) // 36 meses - 50% peso o menos (muy antiguo)
  },
  // Sofía Peralta egresó del Tec de Monterrey (Participa/Miembro = 12)
  {
    id: "rel-18",
    origen: "node-3",
    destino: "node-15",
    tipo: "PERTENECE_A",
    pesoInicial: 12,
    confianza: 100,
    estado: "Activo",
    observaciones: "Graduada de la carrera de Derecho.",
    ultimaInteraccion: getDateXMonthsAgo(30) // 30 meses - 50% peso o menos
  }
];

const SIR_STORAGE_KEY = "SIR_graph_data";

class SIRDatabase {
  static load() {
    try {
      const stored = localStorage.getItem(SIR_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Error reading from localstorage", e);
    }
    // If not set, return defaults
    const defaults = { nodes: DEFAULT_NODES, relations: DEFAULT_RELATIONS };
    SIRDatabase.save(defaults.nodes, defaults.relations);
    return defaults;
  }

  static save(nodes, relations) {
    try {
      localStorage.setItem(SIR_STORAGE_KEY, JSON.stringify({ nodes, relations }));
    } catch (e) {
      console.error("Error writing to localstorage", e);
    }
  }

  static reset() {
    localStorage.removeItem(SIR_STORAGE_KEY);
    return SIRDatabase.load();
  }
}

// Export functions to global scope for browser files
window.SIRDatabase = SIRDatabase;
