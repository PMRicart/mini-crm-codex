const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

// Guarda el archivo SQLite y los datos heredados en la carpeta de datos del proyecto.
const dataDirectory = path.join(__dirname, "..", "data");
const databaseFile = path.join(dataDirectory, "leads.sqlite");
const legacyDataFile = path.join(dataDirectory, "leads.json");

// Crea la carpeta y abre la base de datos; SQLite crea el archivo si aún no existe.
fs.mkdirSync(dataDirectory, { recursive: true });
const database = new Database(databaseFile);

// Define la tabla y sus restricciones para que cada lead tenga sus campos básicos.
database.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'nuevo',
    created_at TEXT NOT NULL
  )
`);

// Traslada los datos JSON previos una sola vez y mantiene la base de datos como fuente de verdad.
function migrateLegacyLeads() {
  const row = database.prepare("SELECT COUNT(*) AS count FROM leads").get();
  if (row.count > 0 || !fs.existsSync(legacyDataFile)) return;

  const legacyLeads = JSON.parse(fs.readFileSync(legacyDataFile, "utf8"));
  if (!Array.isArray(legacyLeads)) {
    throw new Error("El archivo heredado de leads debe contener una lista JSON.");
  }

  const insertLegacyLead = database.prepare(`
    INSERT INTO leads (id, name, email, company, source, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const migrate = database.transaction((leads) => {
    for (const lead of leads) {
      if (!lead || typeof lead.name !== "string" || typeof lead.email !== "string") continue;
      insertLegacyLead.run(
        String(lead.id || ""),
        lead.name,
        lead.email,
        typeof lead.company === "string" ? lead.company : "",
        typeof lead.source === "string" ? lead.source : "",
        typeof lead.status === "string" ? lead.status : "nuevo",
        typeof lead.createdAt === "string" ? lead.createdAt : new Date().toISOString(),
      );
    }
  });

  migrate(legacyLeads);
}

migrateLegacyLeads();

// Convierte filas SQL a la forma JSON que ya consume el frontend.
const selectAllLeads = database.prepare(`
  SELECT id, name, email, company, source, status, created_at AS createdAt
  FROM leads
  ORDER BY created_at DESC
`);
const selectLeadById = database.prepare(`
  SELECT id, name, email, company, source, status, created_at AS createdAt
  FROM leads
  WHERE id = ?
`);
const selectLeadsForExport = database.prepare(`
  SELECT name, email, source, status, created_at AS created_at
  FROM leads
  ORDER BY created_at DESC
`);

function loadLeads() {
  return selectAllLeads.all();
}

function loadLeadsForExport() {
  return selectLeadsForExport.all();
}

// Inserta un lead mediante parámetros SQL, sin concatenar datos de la petición en la consulta.
function createLead(lead) {
  const insertLead = database.prepare(`
    INSERT INTO leads (id, name, email, company, source, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertLead.run(
    lead.id,
    lead.name,
    lead.email,
    lead.company,
    lead.source,
    lead.status,
    lead.createdAt,
  );
  return lead;
}

// Actualiza solo campos permitidos y devuelve null si el identificador no existe.
function updateLead(id, updates) {
  const allowedFields = ["name", "email", "company", "source", "status"];
  const fields = Object.keys(updates).filter((field) => allowedFields.includes(field));
  if (fields.length === 0) return selectLeadById.get(id) ?? null;

  const assignments = fields.map((field) => `${field} = ?`).join(", ");
  const values = fields.map((field) => updates[field]);
  const result = database.prepare(`UPDATE leads SET ${assignments} WHERE id = ?`).run(...values, id);
  return result.changes === 0 ? null : selectLeadById.get(id);
}

// Elimina por identificador y comunica si había un registro que borrar.
function deleteLead(id) {
  return database.prepare("DELETE FROM leads WHERE id = ?").run(id).changes > 0;
}

module.exports = { loadLeads, loadLeadsForExport, createLead, updateLead, deleteLead };
