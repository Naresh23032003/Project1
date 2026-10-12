import next from "eslint-config-next";

const config = [...next, { ignores: [".claude/**", ".next/**", "node_modules/**", "public/pdf.worker*", "scratch-shots/**", "test-results/**"] }];

export default config;
