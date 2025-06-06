import { generateFiles } from "fumadocs-openapi";

const PRODUCTION = process.env.NODE_ENV === "production";
const INPUT = PRODUCTION
  ? // If in production, use the bundled OpenAPI spec
    "./openapi.json"
  : // If in development, use the local server to fetch the OpenAPI spec
    `http://localhost:8000/openapi.json`;

void generateFiles({
  input: INPUT,
  output: "./content/docs/api",
  includeDescription: true,
});
