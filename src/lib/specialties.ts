// Lista oficial de especialidades médicas reconhecidas e áreas de atuação.
// Mantida em ordem alfabética (pt-BR) automaticamente.

const sortPt = (arr: string[]) =>
  [...arr].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));

export const SPECIALTIES = sortPt([
  "Acupuntura","Alergia e Imunologia","Anestesiologia","Angiologia","Cardiologia",
  "Cirurgia Cardiovascular","Cirurgia da Mão","Cirurgia de Cabeça e Pescoço",
  "Cirurgia do Aparelho Digestivo","Cirurgia Geral","Cirurgia Oncológica",
  "Cirurgia Pediátrica","Cirurgia Plástica","Cirurgia Torácica","Cirurgia Vascular",
  "Clínica Médica","Coloproctologia","Dermatologia","Endocrinologia e Metabologia",
  "Endoscopia","Gastroenterologia","Genética Médica","Geriatria",
  "Ginecologia e Obstetrícia","Hematologia e Hemoterapia","Homeopatia",
  "Infectologia","Mastologia","Medicina de Emergência",
  "Medicina de Família e Comunidade","Medicina do Trabalho","Medicina do Tráfego",
  "Medicina Esportiva","Medicina Física e Reabilitação","Medicina Intensiva",
  "Medicina Legal e Perícia Médica","Medicina Nuclear","Medicina Preventiva e Social",
  "Nefrologia","Neurocirurgia","Neurologia","Nutrologia","Oftalmologia",
  "Oncologia Clínica","Ortopedia e Traumatologia","Otorrinolaringologia",
  "Patologia","Patologia Clínica/Medicina Laboratorial","Pediatria","Pneumologia",
  "Psiquiatria","Radiologia e Diagnóstico por Imagem","Radioterapia",
  "Reumatologia","Urologia",
]);

export const AREAS_OF_ACTUATION = sortPt([
  "Administração em Saúde","Alergia e Imunologia Pediátrica",
  "Angiorradiologia e Cirurgia Endovascular","Atendimento ao Queimado",
  "Auditoria Médica","Cardiologia Pediátrica","Cirurgia Bariátrica",
  "Cirurgia Crânio-Maxilo-Facial","Cirurgia do Trauma","Cirurgia Videolaparoscópica",
  "Citopatologia","Densitometria Óssea","Dor","Ecocardiografia",
  "Ecografia Vascular com Doppler","Eletrofisiologia Clínica Invasiva",
  "Emergência Pediátrica","Endocrinologia Pediátrica","Endoscopia Digestiva",
  "Endoscopia Ginecológica","Endoscopia Respiratória","Ergometria",
  "Estimulação Cardíaca Eletrônica Implantável","Foniatria",
  "Gastroenterologia Pediátrica","Hansenologia",
  "Hematologia e Hemoterapia Pediátrica","Hemodinâmica e Cardiologia Intervencionista",
  "Hepatologia","Infectologia Hospitalar","Infectologia Pediátrica","Mamografia",
  "Medicina Aeroespacial","Medicina do Adolescente","Medicina do Sono",
  "Medicina Fetal","Medicina Intensiva Pediátrica","Medicina Paliativa",
  "Medicina Tropical","Nefrologia Pediátrica","Neonatologia",
  "Neurofisiologia Clínica","Neurologia Pediátrica","Neurorradiologia",
  "Nutrição Parenteral e Enteral","Nutrição Parenteral e Enteral Pediátrica",
  "Nutrologia Pediátrica","Oncogenética","Oncologia Pediátrica",
  "Pneumologia Pediátrica","Psicogeriatria","Psicoterapia",
  "Psiquiatria da Infância e Adolescência","Psiquiatria Forense",
  "Radiologia Intervencionista e Angiorradiologia","Reprodução Assistida",
  "Reumatologia Pediátrica","Sexologia","Toxicologia Médica",
  "Transplante de Medula Óssea","Ultrassonografia em Ginecologia e Obstetrícia",
  "Ultrassonografia Geral",
]);

export const ADDITIONAL_OPTIONS = sortPt(
  Array.from(new Set<string>([...SPECIALTIES, ...AREAS_OF_ACTUATION]))
);
