const { initDb } = require('./db');
console.log("Старт...");
initDb()
  .then(() => { console.log("✅ УСПЕХ!"); process.exit(0); })
  .catch(e => { console.error("❌ ОШИБКА:", e.message); process.exit(1); });