const form = document.querySelector("#lead-form");
const nameInput = document.querySelector("#name");
const emailInput = document.querySelector("#email");
const sourceInput = document.querySelector("#source");
const statusInput = document.querySelector("#status");
const formTitle = document.querySelector("#form-title");
const formEyebrow = document.querySelector("#form-eyebrow");
const leadsBody = document.querySelector("#leads-body");
const leadCount = document.querySelector("#lead-count");
const leadSearch = document.querySelector("#lead-search");
const statusFilter = document.querySelector("#status-filter");
const formMessage = document.querySelector("#form-message");
const submitButton = form.querySelector("button[type='submit']");
const submitLabel = submitButton.querySelector("span");
const cancelEditButton = document.querySelector("#cancel-edit");
const pagination = document.querySelector("#pagination");
const previousPageButton = document.querySelector("#previous-page");
const nextPageButton = document.querySelector("#next-page");
const pageStatus = document.querySelector("#page-status");
const pageSize = 10;
let allLeads = [];
let currentPage = 1;
let editingLeadId = null;

function setMessage(message, isSuccess = false) {
  formMessage.textContent = message;
  formMessage.classList.toggle("success", isSuccess);
}

function getFilteredLeads() {
  const query = leadSearch.value.trim().toLocaleLowerCase();
  const selectedStatus = statusFilter.value;
  return allLeads.filter((lead) => {
    const matchesSearch = !query || [lead.name, lead.email].some((value) =>
      String(value || "").toLocaleLowerCase().includes(query),
    );
    const matchesStatus = selectedStatus === "todos" || (lead.status || "nuevo") === selectedStatus;
    return matchesSearch && matchesStatus;
  });
}

function renderLeads() {
  leadsBody.replaceChildren();
  const filteredLeads = getFilteredLeads();
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  currentPage = Math.min(currentPage, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleLeads = filteredLeads.slice(startIndex, startIndex + pageSize);
  leadCount.textContent = `${filteredLeads.length} ${filteredLeads.length === 1 ? "lead" : "leads"}`;
  pagination.hidden = totalPages <= 1;
  previousPageButton.disabled = currentPage <= 1;
  nextPageButton.disabled = currentPage >= totalPages;
  pageStatus.textContent = `Página ${currentPage} de ${totalPages}`;

  if (filteredLeads.length === 0) {
    const row = document.createElement("tr");
    row.className = "empty-row";
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = allLeads.length === 0
      ? "Todavía no hay leads. Añade tu primer contacto arriba."
      : "No hay leads que coincidan con estos filtros.";
    row.append(cell);
    leadsBody.append(row);
    return;
  }

  visibleLeads.forEach((lead) => {
    const row = document.createElement("tr");
    const nameCell = document.createElement("td");
    const emailCell = document.createElement("td");
    const sourceCell = document.createElement("td");
    const statusCell = document.createElement("td");
    const actionsCell = document.createElement("td");
    const emailLink = document.createElement("a");
    const statusBadge = document.createElement("span");

    nameCell.textContent = lead.name;
    emailLink.href = `mailto:${encodeURIComponent(lead.email)}`;
    emailLink.textContent = lead.email;
    emailCell.append(emailLink);
    sourceCell.textContent = lead.source || "—";
    statusBadge.className = `status-badge status-${lead.status || "nuevo"}`;
    statusBadge.textContent = lead.status || "nuevo";
    statusCell.append(statusBadge);
    const editButton = document.createElement("button");
    editButton.className = "row-button";
    editButton.type = "button";
    editButton.dataset.action = "edit";
    editButton.dataset.leadId = lead.id;
    editButton.textContent = "Editar";
    editButton.setAttribute("aria-label", `Editar a ${lead.name}`);

    const deleteButton = document.createElement("button");
    deleteButton.className = "row-button row-button-danger";
    deleteButton.type = "button";
    deleteButton.dataset.action = "delete";
    deleteButton.dataset.leadId = lead.id;
    deleteButton.textContent = "Eliminar";
    deleteButton.setAttribute("aria-label", `Eliminar a ${lead.name}`);

    actionsCell.className = "row-actions";
    actionsCell.append(editButton, deleteButton);
    row.append(nameCell, emailCell, sourceCell, statusCell, actionsCell);
    leadsBody.append(row);
  });
}

async function loadLeads({ showLatest = false } = {}) {
  try {
    const response = await fetch("/leads");
    if (!response.ok) throw new Error("No se pudieron cargar los leads.");
    allLeads = await response.json();
    const totalPages = Math.max(1, Math.ceil(allLeads.length / pageSize));
    currentPage = showLatest ? totalPages : Math.min(currentPage, totalPages);
    renderLeads();
  } catch (error) {
    leadsBody.replaceChildren();
    const row = document.createElement("tr");
    row.className = "empty-row";
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = error.message || "No se pudo conectar con la API.";
    row.append(cell);
    leadsBody.append(row);
  }
}

function startEditing(lead) {
  editingLeadId = lead.id;
  nameInput.value = lead.name;
  emailInput.value = lead.email;
  sourceInput.value = lead.source || "";
  statusInput.value = lead.status || "nuevo";
  formEyebrow.textContent = "EDITAR CONTACTO";
  formTitle.textContent = "Edita el lead";
  submitLabel.textContent = "Guardar cambios";
  cancelEditButton.hidden = false;
  setMessage("");
  form.scrollIntoView({ behavior: "smooth", block: "center" });
  nameInput.focus({ preventScroll: true });
}

function resetForm() {
  editingLeadId = null;
  form.reset();
  formEyebrow.textContent = "NUEVO CONTACTO";
  formTitle.textContent = "Añade un lead";
  submitLabel.textContent = "Añadir lead";
  cancelEditButton.hidden = true;
}

async function handleRowAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const lead = allLeads.find((item) => item.id === button.dataset.leadId);
  if (!lead) return;

  if (button.dataset.action === "edit") {
    startEditing(lead);
    return;
  }

  button.disabled = true;
  setMessage("");
  try {
    const response = await fetch(`/leads/${encodeURIComponent(lead.id)}`, { method: "DELETE" });
    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || "No se pudo eliminar el lead.");
    }
    if (editingLeadId === lead.id) resetForm();
    setMessage("Lead eliminado correctamente.", true);
    await loadLeads();
  } catch (error) {
    setMessage(error.message || "No se pudo conectar con la API.");
    button.disabled = false;
  }
}

leadsBody.addEventListener("click", handleRowAction);
leadSearch.addEventListener("input", () => {
  currentPage = 1;
  renderLeads();
});
statusFilter.addEventListener("change", () => {
  currentPage = 1;
  renderLeads();
});
cancelEditButton.addEventListener("click", () => {
  resetForm();
  setMessage("");
});

previousPageButton.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage -= 1;
    renderLeads();
  }
});

nextPageButton.addEventListener("click", () => {
  const totalPages = Math.ceil(getFilteredLeads().length / pageSize);
  if (currentPage < totalPages) {
    currentPage += 1;
    renderLeads();
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");
  submitButton.disabled = true;

  try {
    const response = await fetch(editingLeadId ? `/leads/${encodeURIComponent(editingLeadId)}` : "/leads", {
      method: editingLeadId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        source: sourceInput.value.trim(),
        status: statusInput.value,
      }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No se pudo guardar el lead.");

    const wasEditing = Boolean(editingLeadId);
    resetForm();
    setMessage(wasEditing ? "Lead actualizado correctamente." : "Lead añadido correctamente.", true);
    await loadLeads({ showLatest: !wasEditing });
    nameInput.focus();
  } catch (error) {
    setMessage(error.message || "No se pudo conectar con la API.");
  } finally {
    submitButton.disabled = false;
  }
});

loadLeads();
