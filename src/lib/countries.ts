/** Opciones de país usadas en registro y filtros de admin */
export const COUNTRY_OPTIONS = [
  "Uruguay",
  "Argentina",
  "Chile",
  "Colombia",
  "México",
  "Venezuela",
  "Regional",
] as const;

export type CountryOption = (typeof COUNTRY_OPTIONS)[number];
