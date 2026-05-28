export type WikiSubject = {
  id: string;
  codigo: string;
  nombre: string;
  carrera: string;
  semestre: string;
  creditos: number;
  profesor: string;
  horario: string;
  aula: string;
  cupo: number;
  inscritos: number;
};

export type WikiEnrollmentStudent = {
  enrollmentId?: string;
  userId: string;
  nombre: string;
  email: string;
  carrera: string;
  fecha: string;
};
