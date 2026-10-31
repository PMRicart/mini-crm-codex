const express = require("express");
const { randomUUID } = require("node:crypto");
const path = require("node:path");
const { loadLeads, loadLeadsForExport, createLead, updateLead, deleteLead } = require("./lead-store");

const app = express();

// Permite recibir JSON y sirve los recursos estáticos existentes sin modificar el frontend.
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// Comprueba el estado básico de la API.
app.get("/", (req, res) => {
  res.status(200).send("La API del mini CRM está funcionando.");
});

// Obtiene los leads directamente desde SQLite en cada petición.
app.get("/leads", (req, res) => {
  try {
    return res.status(200).json(loadLeads());
  } catch (error) {
    console.error("Error al leer los leads:", error);
    return res.status(500).json({ error: "No se pudieron cargar los leads." });
  }
});

// Exporta todos los leads con columnas CSV escapadas de forma segura.
app.get("/leads/export.csv", (req, res) => {
  try {
    const columns = ["name", "email", "source", "status", "created_at"];
    const escapeCsvValue = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = loadLeadsForExport();
    const csv = [
      columns.join(","),
      ...rows.map((lead) => columns.map((column) => escapeCsvValue(lead[column])).join(",")),
    ].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="leads.csv"');
    return res.status(200).send(`\uFEFF${csv}`);
  } catch (error) {
    console.error("Error al exportar los leads:", error);
    return res.status(500).json({ error: "No se pudieron exportar los leads." });
  }
});

// Valida los campos del nuevo lead y lo inserta en la base de datos.
app.post("/leads", (req, res) => {
  const { name, email, company, source, status } = req.body ?? {};

  if (typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "El campo 'name' es obligatorio." });
  }

  if (typeof email !== "string" || email.trim() === "") {
    return res.status(400).json({ error: "El campo 'email' es obligatorio." });
  }

  const allowedStatuses = ["nuevo", "contactado", "perdido"];
  if (status !== undefined && !allowedStatuses.includes(status)) {
    return res.status(400).json({ error: "El campo 'status' debe ser nuevo, contactado o perdido." });
  }

  const lead = {
    id: randomUUID(),
    name: name.trim(),
    email: email.trim(),
    company: typeof company === "string" ? company.trim() : "",
    source: typeof source === "string" ? source.trim() : "",
    status: status ?? "nuevo",
    createdAt: new Date().toISOString(),
  };

  try {
    createLead(lead);
    return res.status(201).json(lead);
  } catch (error) {
    console.error("Error al guardar el lead:", error);
    return res.status(500).json({ error: "No se pudo guardar el lead. Inténtalo de nuevo." });
  }
});

// Verifica y aplica los campos editables usando la operación de actualización SQLite.
app.patch("/leads/:id", (req, res) => {
  const updates = req.body ?? {};
  const editableFields = ["name", "email", "company", "source", "status"];
  const providedFields = editableFields.filter((field) => Object.hasOwn(updates, field));

  if (providedFields.length === 0) {
    return res.status(400).json({ error: "Indica al menos un campo para actualizar." });
  }

  for (const field of providedFields) {
    const value = updates[field];
    if (typeof value !== "string") {
      return res.status(400).json({ error: `El campo '${field}' debe ser texto.` });
    }
    if (["name", "email"].includes(field) && value.trim() === "") {
      return res.status(400).json({ error: `El campo '${field}' es obligatorio.` });
    }
    if (field === "status" && !["nuevo", "contactado", "perdido"].includes(value)) {
      return res.status(400).json({ error: "El campo 'status' debe ser nuevo, contactado o perdido." });
    }
  }

  const sanitizedUpdates = Object.fromEntries(
    providedFields.map((field) => [field, updates[field].trim()]),
  );

  try {
    const lead = updateLead(req.params.id, sanitizedUpdates);
    if (!lead) return res.status(404).json({ error: "Lead no encontrado." });
    return res.status(200).json(lead);
  } catch (error) {
    console.error("Error al actualizar el lead:", error);
    return res.status(500).json({ error: "No se pudo guardar el cambio. Inténtalo de nuevo." });
  }
});

// Borra el lead en SQLite y mantiene la respuesta 204 del endpoint existente.
app.delete("/leads/:id", (req, res) => {
  try {
    if (!deleteLead(req.params.id)) {
      return res.status(404).json({ error: "Lead no encontrado." });
    }
    return res.status(204).end();
  } catch (error) {
    console.error("Error al eliminar el lead:", error);
    return res.status(500).json({ error: "No se pudo eliminar el lead. Inténtalo de nuevo." });
  }
});

// Devuelve una respuesta JSON uniforme cuando la ruta solicitada no existe.
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada." });
});

// Traduce errores habituales del cuerpo JSON y oculta detalles internos al cliente.
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "El cuerpo de la petición debe ser JSON válido." });
  }

  console.error("Error inesperado:", err);
  return res.status(500).json({ error: "Error interno del servidor." });
});

module.exports = app;
