import { db, Subject } from 'astro:db';

// ── helpers ──────────────────────────────────────────────────────────────────

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

const SCHEDULES = [
  { horario: 'Lun y Mié 07:00-09:00', aula: 'Aula A-101' },
  { horario: 'Lun y Mié 09:00-11:00', aula: 'Aula A-102' },
  { horario: 'Lun y Mié 11:00-13:00', aula: 'Aula A-103' },
  { horario: 'Mar y Jue 07:00-09:00', aula: 'Aula A-201' },
  { horario: 'Mar y Jue 09:00-11:00', aula: 'Aula A-202' },
  { horario: 'Mar y Jue 11:00-13:00', aula: 'Aula A-203' },
  { horario: 'Lun y Mié 13:00-15:00', aula: 'Aula B-101' },
  { horario: 'Mar y Jue 13:00-15:00', aula: 'Aula B-102' },
  { horario: 'Vie 07:00-10:00',       aula: 'Aula B-201' },
  { horario: 'Vie 10:00-13:00',       aula: 'Aula B-202' },
  { horario: 'Sáb 07:00-10:00',       aula: 'Aula C-101' },
  { horario: 'Sáb 10:00-13:00',       aula: 'Aula C-102' },
  { horario: 'Lun y Mié 15:00-17:00', aula: 'Aula C-201' },
  { horario: 'Mar y Jue 15:00-17:00', aula: 'Aula C-202' },
  { horario: 'Vie 13:00-16:00',       aula: 'Aula C-203' },
];

const PROF_AGRO = [
  'Ing. Ana Rivas Morales', 'Ing. Roberto Cruz Flores',
  'Lic. María García López', 'Dr. José Alfredo Flores',
  'Ing. Patricia Álvarez', 'MSc. Carlos Henríquez',
];
const PROF_ADM = [
  'MBA Rosa Delgado Mejía', 'Lic. Carmen Vega Ortiz',
  'Lic. Jorge Pineda Santos', 'Lic. Andrés Mejía Rivera',
  'Lic. Silvia Hernández', 'MBA Ernesto Castillo',
];
const PROF_COMP = [
  'Ing. Laura Castillo Ruiz', 'Ing. Diego Ramírez López',
  'Dr. Fernando Núñez Cruz', 'Ing. Andrea Salazar',
  'MSc. Ricardo Portillo', 'Ing. Claudia Martínez',
];
const PROF_JUR = [
  'Abg. Claudia Morales Torres', 'Dr. Ricardo Fuentes Díaz',
  'Abg. Silvia Pérez Vásquez', 'Abg. Mario Leiva Campos',
  'Lic. Ana Lissette Ramos', 'Dr. Hugo Peralta',
];
const PROF_CONT = [
  'CPA Luis Arévalo Chávez', 'Lic. Marta Solís Benítez',
  'CPA Elena Rivas Turcios', 'Lic. Oscar Montoya',
  'CPA Karla Gutiérrez', 'Lic. Julio Mendoza',
];
const PROF_TDAI = [
  'Ing. Andrea Salazar Rivera', 'Ing. Diego Ramírez López',
  'MSc. Ricardo Portillo Cruz', 'Ing. Claudia Martínez',
];
const PROF_ILING = [
  'Mtra. Jennifer Walsh Cruz', 'Lic. Roberto Morales Reyes',
  'Mtra. Karen Flores Smith', 'Lic. Ana Cecilia Bonilla',
  'Mtra. Sandra López', 'Lic. Carlos Sandoval',
];
const PROF_PSI = [
  'Lic. Beatriz Campos Ruiz', 'Mtra. Elena Ríos Vásquez',
  'Lic. Gabriel Navas Torres', 'Mtra. Verónica Chávez',
  'Lic. Roberto Herrera', 'Dr. Patricia Ayala',
];
const PROF_TEO = [
  'Teól. Samuel Rivera Cruz', 'Lic. Miriam Leiva Flores',
  'Dr. Juan Pérez Benítez', 'Pastor Marco Turcios',
  'Lic. Ruth Solís Díaz', 'Dr. David Andrade',
];
const PROF_TS = [
  'Lic. Sandra Molina Ríos', 'MSc. Rafael Torres Díaz',
  'Lic. Carmen Herrera López', 'MSc. Ingrid Flores',
  'Lic. Eduardo Mejía', 'MSc. Diana Castillo',
];

// ── curriculum ───────────────────────────────────────────────────────────────

type Curriculum = Record<string, string[][]>;

const CURRICULUM: Curriculum = {

  // ── Facultad de Ciencias del Hombre y la Naturaleza ──────────────────────

  'Ingeniería Agroecológica': [
    /* C I   */ ['Matemática I', 'Sociología General', 'Química General', 'Biología General', 'Inglés Técnico'],
    /* C II  */ ['Matemática II', 'Informática', 'Química Orgánica', 'Botánica Agrícola', 'Ética'],
    /* C III */ ['Estadística', 'Técnicas de Investigación', 'Bioquímica', 'Nuevas Tecnologías en Agroecología', 'Microbiología Agrícola'],
    /* C IV  */ ['Física General', 'Fitopatología General', 'Fisiología Vegetal', 'Edafología', 'Entomología'],
    /* C V   */ ['Agroecología', 'Principios de Riego', 'Anatomía y Fisiología Animal', 'Cultivos Orgánicos', 'Genética'],
    /* C VI  */ ['Topografía', 'Sanidad Animal', 'Zootecnia I', 'Práctica Agroecológica I'],
    /* C VII */ ['Economía', 'Diseños Experimentales', 'Zootecnia II', 'Práctica Agroecológica II'],
    /* C VIII*/ ['Sistemas de Información Geográfica', 'Ecología y Agroclimatología', 'Zootecnia III', 'Práctica Agroecológica III'],
    /* C IX  */ ['Legislación Ambiental', 'Administración Agroecológica', 'Práctica Pecuaria', 'Agricultura de Precisión'],
    /* C X   */ ['Gerencia de Proyectos', 'Cambio Climático y Gestión de Riesgo', 'Seminario de Investigación'],
  ],

  'Licenciatura en Administración de Empresas': [
    /* C I   */ ['Contabilidad Financiera I', 'Sociología General', 'Matemática I', 'Psicología General', 'Filosofía General'],
    /* C II  */ ['Contabilidad Financiera II', 'Inglés', 'Matemática II', 'Economía', 'Ética y Responsabilidad Social Empresarial'],
    /* C III */ ['Contabilidad de Costos', 'Planificación de la Producción', 'Matemática Financiera', 'Microeconomía', 'Fundamentos de Administración'],
    /* C IV  */ ['Administración Turística', 'Derecho Mercantil', 'Redacción de Informes Gerenciales', 'Macroeconomía', 'Técnicas de Investigación'],
    /* C V   */ ['Administración Financiera', 'Derecho Laboral', 'Informática', 'Gerencia del Talento Humano', 'Estadística'],
    /* C VI  */ ['Administración Pública', 'Auditoría Interna', 'Sistemas de Información y Bases de Datos', 'Gerencia de Proyectos', 'Emprendimiento e Innovación Empresarial'],
    /* C VII */ ['Economía Internacional', 'Marketing Estratégico', 'Inteligencia de Negocios', 'Gerencia de Compras', 'Consultoría Empresarial'],
    /* C VIII*/ ['Comercio y Negocios Internacionales', 'Marketing Digital', 'Inteligencia Artificial Aplicada a los Negocios', 'Gerencia de Ventas'],
    /* C IX  */ ['Logística y Aduanas', 'Investigación de Mercados', 'Inglés Técnico', 'Banca y Finanzas'],
    /* C X   */ ['Seminario de Alta Gerencia', 'Práctica Profesional', 'Seminario de Investigación'],
  ],

  'Licenciatura en Ciencias de la Computación': [
    /* C I   */ ['Introducción al Hardware', 'Inglés', 'Algoritmos', 'Introducción al Software Libre', 'Filosofía General'],
    /* C II  */ ['Matemática I', 'Programación Orientada a Objetos', 'Ingeniería de Software', 'Inglés Técnico', 'Ética y Responsabilidad Social Empresarial'],
    /* C III */ ['Fundamentos de Redes', 'Desarrollo Web', 'Investigación Científica', 'Base de Datos', 'Matemática II'],
    /* C IV  */ ['Configuración de Dispositivos de Redes', 'Proyectos de Aplicaciones Web', 'Desarrollo Móvil', 'Análisis de Datos y Reportería Estratégica', 'Robótica Educativa'],
    /* C V   */ ['Economía', 'Seguridad Informática', 'Proyectos de Aplicaciones Móviles', 'Herramientas de Inteligencia Artificial para el Desarrollo Web', 'Ecología, Gestión y Mitigación de Riesgos'],
    /* C VI  */ ['Fundamentos de Administración', 'Redacción y Ortografía', 'Nuevas Tendencias de Programación', 'Contabilidad Financiera I'],
    /* C VII */ ['Derecho Laboral', 'Marketing Digital', 'Proyectos de Nuevas Tendencias de Programación'],
    /* C VIII*/ ['Consultoría Empresarial', 'Empresas y Cooperativas de Software', 'Gerencia de Proyectos'],
    /* C IX  */ ['Administración de Sistemas Informáticos', 'Proyectos de Software Libre', 'Proyectos Ágiles'],
    /* C X   */ ['Práctica Profesional Informática', 'Auditoría de Sistemas', 'Seminario de Investigación'],
  ],

  'Licenciatura en Ciencias Jurídicas': [
    /* C I   */ ['Técnicas de Redacción y Ortografía', 'Introducción al Estudio del Derecho I', 'Filosofía General', 'Técnicas de Investigación', 'Sociología General'],
    /* C II  */ ['Introducción al Estudio del Derecho II', 'Historia del Derecho', 'Introducción al Estudio del Derecho Procesal', 'Informática', 'Inglés'],
    /* C III */ ['Derecho Civil: Bienes', 'Derechos Humanos', 'Ética Profesional', 'Derecho Ambiental', 'Derecho Constitucional I'],
    /* C IV  */ ['Derecho Civil: Obligaciones', 'Derecho Procesal Civil y Mercantil I', 'Derecho Penal I', 'Derecho de Familia', 'Derecho Constitucional II'],
    /* C V   */ ['Derecho Mercantil I', 'Derecho Civil: Contratos', 'Derecho Procesal Civil y Mercantil II', 'Derecho Penal II', 'Derecho Laboral I'],
    /* C VI  */ ['Derecho Procesal de Familia', 'Derecho Civil: Sucesiones', 'Derecho Mercantil II', 'Derecho Procesal Penal I', 'Derecho Laboral II'],
    /* C VII */ ['Derecho Procesal Civil y Mercantil III', 'Derecho Registral', 'Derecho Mercantil III', 'Derecho Procesal Penal II', 'Derecho Procesal Laboral'],
    /* C VIII*/ ['Derecho Administrativo I', 'Derecho de Niñez y Adolescencia', 'Derecho Internacional Privado', 'Derecho Internacional Público'],
    /* C IX  */ ['Derecho Administrativo II', 'Derecho Tributario', 'Criminología y Medicina Forense', 'Derecho Notarial'],
    /* C X   */ ['Oratoria Forense', 'Seminario de Investigación'],
  ],

  'Licenciatura en Contaduría Pública': [
    /* C I   */ ['Contabilidad Financiera I', 'Sociología General', 'Matemática I', 'Psicología General', 'Filosofía General'],
    /* C II  */ ['Contabilidad Financiera II', 'Inglés', 'Matemática II', 'Economía', 'Ética y Responsabilidad Social Empresarial'],
    /* C III */ ['Contabilidad Financiera III', 'Contabilidad de Costos', 'Matemática Financiera', 'Microeconomía', 'Fundamentos de Administración'],
    /* C IV  */ ['Contabilidad Financiera IV', 'Derecho Mercantil', 'Redacción de Informes Gerenciales', 'Macroeconomía', 'Técnicas de Investigación'],
    /* C V   */ ['Contabilidad Financiera V', 'Derecho Laboral', 'Informática', 'Administración Financiera', 'Estadística'],
    /* C VI  */ ['Auditoría Interna', 'Derecho Aduanero', 'Sistemas de Información y Bases de Datos', 'Gerencia de Proyectos', 'Emprendimiento e Innovación Empresarial'],
    /* C VII */ ['Auditoría Financiera I', 'Derecho Tributario I', 'Inteligencia de Negocios', 'Contabilidades Especiales', 'Consultoría Empresarial'],
    /* C VIII*/ ['Auditoría Financiera II', 'Derecho Tributario II', 'Sistemas Contables Computarizados', 'Contabilidad Gubernamental'],
    /* C IX  */ ['Auditoría Forense', 'Auditoría Fiscal', 'Auditoría de Sistemas Contables Computarizados', 'Auditoría Gubernamental'],
    /* C X   */ ['Seminario de Actualización Contable', 'Práctica Profesional', 'Seminario de Investigación'],
  ],

  'Técnico en Desarrollo de Aplicaciones Informáticas': [
    /* C I   */ ['Diseño de Aplicaciones Basadas en Experiencias del Usuario', 'Aplicación del Pensamiento Computacional', 'Gestión de Proyectos de Desarrollo de Software', 'Práctica de Valores en Distintos Contextos', 'Redacción de Documentos Técnicos'],
    /* C II  */ ['Desarrollo de Aplicaciones Web', 'Implementación de Servidores', 'Producción de Contenido Multimedia', 'Desarrollo de Aplicaciones Móviles', 'Técnicas para Conversar en Inglés'],
    /* C III */ ['Desarrollo de Aplicaciones Híbridas y Multiplataforma', 'Ejecución de Pruebas de Seguridad', 'Herramientas de Inteligencia Artificial para el Desarrollo Móvil', 'Implementación de Modelos de Negocios', 'Técnicas para Redactar en Inglés'],
    /* C IV  */ ['Evaluación de la Calidad de Software', 'Proyectos de Aplicaciones Híbridas y Multiplataforma', 'Ejecución de Pruebas de Validación y Depuración', 'Diseño de Estrategias para el Marketing Móvil', 'Respeto a los Derechos Humanos y Propiedad Intelectual'],
  ],

  'Técnico en Ingeniería Agroecológica': [
    /* C I   */ ['Agroecología', 'Insumos Orgánicos', 'Gerencia de Proyectos', 'Bases de Producción Animal', 'Inglés Técnico I'],
    /* C II  */ ['Manejo de Plagas I', 'Manejo de Suelo I', 'Cambio Climático y Gestión de Riesgo', 'Producción Animal I', 'Inglés Técnico II'],
    /* C III */ ['Manejo de Plagas II', 'Manejo de Suelo II', 'Emprendedurismo Aplicado a la Agroecología', 'Producción Animal II', 'Nuevas Tecnologías en Agroecología'],
    /* C IV  */ ['Manejo de Agroecosistemas', 'Sistemas de Riego', 'Procesamiento de Alimentos', 'Sanidad Animal'],
  ],

  // ── Facultad de Teología y Humanidades ───────────────────────────────────

  'Licenciatura en Idioma Inglés': [
    /* C I   */ ['Inglés Intensivo I', 'Sociología General', 'Técnicas de Redacción y Ortografía', 'Psicología General', 'Filosofía General'],
    /* C II  */ ['Inglés Intensivo II', 'Comprensión Auditiva I', 'Informática', 'Ética Profesional'],
    /* C III */ ['Inglés Intensivo III', 'Comprensión Auditiva II', 'Gramática Inglesa I', 'Comprensión Lectora'],
    /* C IV  */ ['Inglés Intensivo IV', 'Métodos y Técnicas para la Enseñanza del Idioma Inglés', 'Gramática Inglesa II', 'Historia y Cultura Británica y Norteamericana'],
    /* C V   */ ['Inglés Intensivo V', 'Diseño e Implementación de Planes de Clase', 'Gramática Comparada Inglés/Español', 'Literatura Británica y Norteamericana'],
    /* C VI  */ ['Introducción a la Traducción I', 'Métodos y Técnicas de Evaluación de los Aprendizajes', 'Pronunciación y Oratoria en Inglés', 'Técnicas de Redacción en Inglés I'],
    /* C VII */ ['Introducción a la Traducción II', 'Diseño Curricular', 'Técnicas de Investigación', 'Técnicas de Redacción en Inglés II'],
    /* C VIII*/ ['Introducción a la Interpretación I', 'Formulación de Proyectos Orientados al Idioma Inglés', 'Psicología del Trabajo'],
    /* C IX  */ ['Introducción a la Interpretación II', 'Práctica Profesional I'],
    /* C X   */ ['Preparación para Pruebas Estandarizadas', 'Práctica Profesional II'],
  ],

  'Licenciatura en Psicología': [
    /* C I   */ ['Respeto a los Derechos Humanos y Propiedad Intelectual', 'Prácticas de Valores en Distintos Contextos', 'Utilización de Técnicas para Conversar en Inglés', 'Desarrollo de Habilidades Sociales'],
    /* C II  */ ['Aplicación de Enfoque de Integralidad Humana', 'Investigación en Fuentes Secundarias', 'Identificación de Bases Neurológicas del Comportamiento y Procesos Psicológicos', 'Utilización de Técnicas para Redactar en Inglés', 'La Psicología en la Historia'],
    /* C III */ ['Medición de Variables Psicológicas en Distintos Contextos', 'Manejo de Procesos Normales y Anormales de la Neuropsicología', 'Aplicación de Enfoques del Aprendizaje Humano', 'Estrategias y Prácticas Preventivas', 'Aplicación de Enfoque de Desarrollo Psicológico Humano'],
    /* C IV  */ ['Planificación y Diseño de la Investigación', 'Identificación Clínica, Síntomas y Signos', 'Procesos para la Convivencia Escolar', 'Entrevista en Psicología Clínica', 'Análisis Psicosocial Comunitario'],
    /* C V   */ ['Aplicación de Métodos y Técnicas de Investigación en Psicología', 'La Psicología en las Organizaciones', 'Análisis de Procesos de Resiliencia', 'Manejo de Enfoques y Procesos Terapéuticos Clínicos Básicos', 'Aplicación e Interpretación de Pruebas Psicométricas'],
    /* C VI  */ ['Aplicación e Interpretación de Pruebas de Diagnóstico Clínico', 'Selección Escolar', 'Manejo de Enfoques y Procesos Terapéuticos Clínicos Avanzados', 'Análisis e Interpretación de Datos de Investigación en Psicología'],
    /* C VII */ ['Selección de Recursos Humanos en Organizaciones', 'Diagnóstico de Problemas Psicológicos en Escolares', 'Aplicación de las Redes Sociales y TICs en Psicología', 'Métodos para la Elaboración de Proyectos Psicosociales', 'Diseño y Manejo de Talleres y Redes Comunitarias'],
    /* C VIII*/ ['Medición y Desarrollo de la Inteligencia Emocional en Comunidades', 'Aplicación de Apoyos Terapéuticos ante la Violencia', 'Prácticas Psicológicas en las Organizaciones', 'Aplicación de Técnicas Específicas a Escolares', 'Aplicación de Técnicas de Investigación Cualitativa'],
    /* C IX  */ ['Proceso de Estimulación Temprana', 'Práctica de Intervención Comunitaria', 'Manejo de la Orientación Profesional-Vocacional en Centros Educativos', 'Prácticas Clínicas Individuales'],
    /* C X   */ ['Procesos Formativos en las Organizaciones', 'Prácticas Escolares', 'Estrategia de Apoyo a la Comunidad Educativa', 'Psicología Criminalista'],
  ],

  'Licenciatura en Teología': [
    /* C I   */ ['Introducción a la Biblia y a la Teología', 'Sociología General', 'Filosofía General', 'Psicología General', 'Inglés'],
    /* C II  */ ['Pentateuco', 'Antropología Social', 'Historia del Cristianismo', 'Evangelios Sinópticos y Hechos', 'Informática'],
    /* C III */ ['Libros Históricos', 'Pensamiento y Método Teológico', 'Historia de la Iglesia en América Latina y El Salvador', 'Cristología', 'Métodos y Técnicas de Investigación'],
    /* C IV  */ ['Fundamentos del Griego Bíblico', 'Eclesiología', 'Antropología Bíblica', 'Teología en América Latina y El Salvador', 'Ética Profesional'],
    /* C V   */ ['Fundamentos del Hebreo Bíblico', 'Literatura Poética y Sapiencial', 'Administración Eclesiástica', 'Teología y Género', 'Teología Pastoral'],
    /* C VI  */ ['Hermenéutica Bíblica', 'Psicología Pastoral', 'Cartas Paulinas', 'Formulación y Evaluación de Proyectos', 'Sociología Urbana y Rural'],
    /* C VII */ ['Literatura Profética', 'Cartas Universales', 'Teología Contemporánea I', 'Gerencia Social y Trabajo Social', 'Derechos Humanos'],
    /* C VIII*/ ['Ciencias de la Religión', 'Escritos Joánicos y Apocalipsis', 'Teología Contemporánea II', 'Diaconía'],
    /* C IX  */ ['Educación Cristiana', 'Teología Ecuménica', 'Ecoteología', 'Homilética y Liturgia'],
    /* C X   */ ['Seminario de Investigación'],
  ],

  'Licenciatura en Trabajo Social': [
    /* C I   */ ['Técnicas de Redacción y Ortografía', 'Sociología General', 'Introducción al Trabajo Social', 'Psicología General', 'Filosofía General'],
    /* C II  */ ['Estadística Social', 'Antropología Social', 'Metodología del Trabajo Social I', 'Ética Profesional', 'Informática'],
    /* C III */ ['Investigación Social', 'Cooperativismo', 'Metodología del Trabajo Social II', 'Derechos Humanos', 'Inglés'],
    /* C IV  */ ['Principios Generales de Economía', 'Niñez, Adolescencia y Juventud', 'La Comunicación y el Trabajo Social', 'Psicología de la Personalidad', 'Legislación y Trabajo Social'],
    /* C V   */ ['Historia Económica y Social de El Salvador', 'Género y Sociedad', 'Introducción a la Práctica Profesional', 'Psicología Social', 'Gerencia Social y Trabajo Social'],
    /* C VI  */ ['Resolución Alterna de Conflictos', 'Intervención Social, Individual y Familiar', 'Sociología Urbana y Rural', 'Práctica Profesional Institucional', 'Formulación y Evaluación de Proyectos'],
    /* C VII */ ['Método de Educación Popular', 'Planificación Social y Estratégica', 'Práctica Profesional Individual y Familiar', 'Trabajo Social Internacional', 'Grupo y Sociedad'],
    /* C VIII*/ ['Adultez Mayor y Sociedad', 'Práctica Profesional Grupal', 'Salud Pública y Promoción para la Salud', 'Acción Social Comunitaria'],
    /* C IX  */ ['Gestión Estratégica de Riesgo y Medio Ambiente', 'Práctica Profesional Comunitaria', 'Promoción Humana', 'Desarrollo Territorial'],
    /* C X   */ ['Seminarios sobre Problemas Sociales de El Salvador', 'Seminario de Investigación'],
  ],
};

// Career code + professor pool mapping
type CareerMeta = { code: string; profs: string[] };
const CAREER_META: Record<string, CareerMeta> = {
  'Ingeniería Agroecológica':                        { code: 'agro',  profs: PROF_AGRO  },
  'Licenciatura en Administración de Empresas':      { code: 'adm',   profs: PROF_ADM   },
  'Licenciatura en Ciencias de la Computación':      { code: 'comp',  profs: PROF_COMP  },
  'Licenciatura en Ciencias Jurídicas':              { code: 'jur',   profs: PROF_JUR   },
  'Licenciatura en Contaduría Pública':              { code: 'cont',  profs: PROF_CONT  },
  'Técnico en Desarrollo de Aplicaciones Informáticas': { code: 'tdai', profs: PROF_TDAI },
  'Técnico en Ingeniería Agroecológica':             { code: 'tagr',  profs: PROF_AGRO  },
  'Licenciatura en Idioma Inglés':                   { code: 'iling', profs: PROF_ILING },
  'Licenciatura en Psicología':                      { code: 'psi',   profs: PROF_PSI   },
  'Licenciatura en Teología':                        { code: 'teo',   profs: PROF_TEO   },
  'Licenciatura en Trabajo Social':                  { code: 'ts',    profs: PROF_TS    },
};

// ── generate seed array ───────────────────────────────────────────────────────

type SubjectSeed = {
  id: string; codigo: string; nombre: string; carrera: string;
  semestre: string; creditos: number; profesor: string;
  horario: string; aula: string; cupo: number;
};

function generateSubjects(): SubjectSeed[] {
  const out: SubjectSeed[] = [];
  let globalIdx = 0;

  for (const [carrera, ciclos] of Object.entries(CURRICULUM)) {
    const meta = CAREER_META[carrera];
    if (!meta) continue;

    for (let ci = 0; ci < ciclos.length; ci++) {
      const cicloRoman = ROMAN[ci];
      const materias = ciclos[ci];

      for (let mi = 0; mi < materias.length; mi++) {
        const sched = SCHEDULES[globalIdx % SCHEDULES.length];
        const prof  = meta.profs[globalIdx % meta.profs.length];
        globalIdx++;

        const subjIdx = String(mi + 1).padStart(2, '0');
        out.push({
          id:       `${meta.code}-c${ci + 1}-${subjIdx}`,
          codigo:   `${meta.code.toUpperCase()}-${cicloRoman}-${subjIdx}`,
          nombre:   materias[mi],
          carrera,
          semestre: cicloRoman,
          creditos: 3,
          profesor: prof,
          horario:  sched.horario,
          aula:     sched.aula,
          cupo:     35,
        });
      }
    }
  }

  return out;
}

// ── seed function ─────────────────────────────────────────────────────────────

export async function seedWiki() {
  const materias = generateSubjects();

  const existing = await db.select().from(Subject).all();
  const existingIds = new Set(existing.map((s) => s.id));

  // IDs that belong to the old generic catalog (not real ULS ids)
  const oldIds = existing
    .filter((s) => !materias.find((m) => m.id === s.id))
    .map((s) => s.id);

  let added = 0;
  for (const m of materias) {
    if (!existingIds.has(m.id)) {
      await db.insert(Subject).values(m);
      added++;
    }
  }

  if (added > 0) {
    console.log(
      `[seed-wiki] ${added} materias ULS nuevas agregadas (${existing.length + added - oldIds.length} en total).`
    );
  }

  if (oldIds.length > 0) {
    console.log(
      `[seed-wiki] Nota: hay ${oldIds.length} materia(s) del catálogo anterior. Haz un reset de DB para limpiarlas.`
    );
  }
}
