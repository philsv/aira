import { generateFiles } from "fumadocs-openapi";
void generateFiles({
  input: ["http://localhost:8000/openapi.json"],
  output: "./content/docs/api",
  includeDescription: true,
});
