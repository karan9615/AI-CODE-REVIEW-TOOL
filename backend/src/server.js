import envConfig from "../config/envConfig.js";
import app from "./app.js";

app.listen(envConfig.port || 3001, () =>
  console.log(`Backend running on http://localhost:${envConfig.port || 3001}`)
);
