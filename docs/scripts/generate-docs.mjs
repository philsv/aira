import { generateFiles } from "fumadocs-openapi";

const isProduction =
  process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
const input = isProduction
  ? ["./openapi.json"]
  : ["http://localhost:8000/openapi.json"];

void generateFiles({
  input,
  output: "./content/docs/api",
  includeDescription: true,
});
