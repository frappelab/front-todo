const API_BASE_URL = "https://todo-api-7i4r.onrender.com/api/v1/task";

const taskForm = document.getElementById("task-form");
const titleInput = document.getElementById("title-input");
const descriptionInput = document.getElementById("description-input");
const pendingList = document.getElementById("pending-list");
const doneList = document.getElementById("done-list");
const countPending = document.getElementById("count-pending");
const countDone = document.getElementById("count-done");
const emptyMessage = document.getElementById("empty-message");
const statusEl = document.getElementById("status");

const editModal = document.getElementById("edit-modal");
const editForm = document.getElementById("edit-form");
const editIdInput = document.getElementById("edit-id");
const editTitleInput = document.getElementById("edit-title");
const editDescriptionInput = document.getElementById("edit-description");

function showStatus(message, type = "info") {
  statusEl.textContent = message;
  statusEl.className = `status status--${type}`;
  statusEl.hidden = false;
}

function hideStatus() {
  statusEl.hidden = true;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    let message = `Error ${response.status}`;
    try {
      const body = await response.json();
      message = body.message || message;
    } catch (_) {
      /* respuesta sin cuerpo JSON */
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

function createTaskElement(task) {
  const li = document.createElement("li");
  li.className = `task-item${task.isDone ? " task-item--done" : ""}`;
  li.dataset.id = task._id;

  li.innerHTML = `
    <input type="checkbox" class="task-item__checkbox" ${task.isDone ? "checked" : ""} />
    <div class="task-item__body">
      <div class="task-item__title">${escapeHtml(task.title)}</div>
      ${task.description ? `<div class="task-item__description">${escapeHtml(task.description)}</div>` : ""}
    </div>
    <div class="task-item__actions">
      <button type="button" class="icon-btn" data-action="edit" title="Editar">✎</button>
      <button type="button" class="icon-btn icon-btn--danger" data-action="delete" title="Eliminar">✕</button>
    </div>
  `;

  return li;
}

function renderTasks(tasks) {
  pendingList.innerHTML = "";
  doneList.innerHTML = "";

  const pending = tasks.filter((t) => !t.isDone);
  const done = tasks.filter((t) => t.isDone);

  pending.forEach((task) => pendingList.appendChild(createTaskElement(task)));
  done.forEach((task) => doneList.appendChild(createTaskElement(task)));

  countPending.textContent = pending.length;
  countDone.textContent = done.length;

  emptyMessage.hidden = tasks.length !== 0;
}

async function loadTasks() {
  try {
    hideStatus();
    const tasks = await apiRequest(API_BASE_URL);
    renderTasks(tasks || []);
  } catch (error) {
    showStatus(`No se pudieron cargar las tareas: ${error.message}`, "error");
  }
}

async function createTask(title, description) {
  await apiRequest(API_BASE_URL, {
    method: "POST",
    body: JSON.stringify({ title, description }),
  });
}

async function updateTask(id, changes) {
  await apiRequest(`${API_BASE_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(changes),
  });
}

async function deleteTask(id) {
  await apiRequest(`${API_BASE_URL}/${id}`, { method: "DELETE" });
}

taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();
  if (!title) return;

  const submitBtn = taskForm.querySelector("button[type=submit]");
  submitBtn.disabled = true;

  try {
    await createTask(title, description);
    titleInput.value = "";
    descriptionInput.value = "";
    titleInput.focus();
    await loadTasks();
  } catch (error) {
    showStatus(`No se pudo crear la tarea: ${error.message}`, "error");
  } finally {
    submitBtn.disabled = false;
  }
});

function findTaskListItem(target) {
  return target.closest(".task-item");
}

async function handleListClick(event) {
  const actionBtn = event.target.closest("[data-action]");
  const checkbox = event.target.closest(".task-item__checkbox");
  const item = findTaskListItem(event.target);
  if (!item) return;
  const id = item.dataset.id;

  if (checkbox) {
    try {
      await updateTask(id, { isDone: checkbox.checked });
      await loadTasks();
    } catch (error) {
      checkbox.checked = !checkbox.checked;
      showStatus(`No se pudo actualizar la tarea: ${error.message}`, "error");
    }
    return;
  }

  if (!actionBtn) return;
  const action = actionBtn.dataset.action;

  if (action === "delete") {
    const confirmed = confirm("¿Eliminar esta tarea?");
    if (!confirmed) return;
    try {
      await deleteTask(id);
      await loadTasks();
    } catch (error) {
      showStatus(`No se pudo eliminar la tarea: ${error.message}`, "error");
    }
  }

  if (action === "edit") {
    const titleText = item.querySelector(".task-item__title").textContent;
    const descriptionEl = item.querySelector(".task-item__description");
    openEditModal(id, titleText, descriptionEl ? descriptionEl.textContent : "");
  }
}

pendingList.addEventListener("click", handleListClick);
doneList.addEventListener("click", handleListClick);

function openEditModal(id, title, description) {
  editIdInput.value = id;
  editTitleInput.value = title;
  editDescriptionInput.value = description;
  editModal.hidden = false;
  editTitleInput.focus();
}

function closeEditModal() {
  editModal.hidden = true;
  editForm.reset();
}

editModal.querySelectorAll("[data-close-modal]").forEach((el) => {
  el.addEventListener("click", closeEditModal);
});

editForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = editIdInput.value;
  const title = editTitleInput.value.trim();
  const description = editDescriptionInput.value.trim();
  if (!title) return;

  try {
    await updateTask(id, { title, description });
    closeEditModal();
    await loadTasks();
  } catch (error) {
    showStatus(`No se pudo editar la tarea: ${error.message}`, "error");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !editModal.hidden) closeEditModal();
});

loadTasks();
