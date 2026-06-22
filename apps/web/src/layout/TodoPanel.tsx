import { Check, ListTodo, PanelRightClose, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { NotificationsBell } from "src/layout/NotificationsBell.js";

type Todo = {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
};

const storageKey = "jurisflow.todos";
const collapsedKey = "jurisflow.todos.collapsed";

const loadTodos = (): Todo[] => {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as Todo[]) : [];
  } catch {
    return [];
  }
};

export const TodoPanel = () => {
  const [todos, setTodos] = useState<Todo[]>(loadTodos);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(collapsedKey) === "true");
  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    localStorage.setItem(collapsedKey, String(collapsed));
  }, [collapsed]);

  const openCount = todos.filter((todo) => !todo.done).length;

  const addTodo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = newText.trim();
    if (!text) return;
    setTodos((current) => [{ id: crypto.randomUUID(), text, done: false, createdAt: new Date().toISOString() }, ...current]);
    setNewText("");
  };

  const toggleTodo = (id: string) => {
    setTodos((current) => current.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)));
  };

  const removeTodo = (id: string) => {
    setTodos((current) => current.filter((todo) => todo.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const saveEdit = (id: string) => {
    const text = editText.trim();
    if (!text) return;
    setTodos((current) => current.map((todo) => (todo.id === id ? { ...todo, text } : todo)));
    setEditingId(null);
  };

  const clearDone = () => setTodos((current) => current.filter((todo) => !todo.done));

  const sorted = [...todos.filter((todo) => !todo.done), ...todos.filter((todo) => todo.done)];

  if (collapsed) {
    return (
      <aside className="todo-panel todo-panel-collapsed" aria-label="Tarefas e notificações">
        <div className="side-rail">
          <NotificationsBell />
          <button
            aria-label="Abrir tarefas"
            className="todo-toggle"
            title={`Tarefas${openCount > 0 ? ` (${openCount} aberta${openCount === 1 ? "" : "s"})` : ""}`}
            type="button"
            onClick={() => setCollapsed(false)}
          >
            <ListTodo size={18} />
            {openCount > 0 ? <span className="todo-count">{openCount}</span> : null}
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="todo-panel" aria-label="Tarefas">
      <div className="todo-header">
        <strong>
          Tarefas {openCount > 0 ? <span className="todo-count">{openCount}</span> : null}
        </strong>
        <div className="todo-header-actions">
          <NotificationsBell />
          <button aria-label="Recolher tarefas" className="todo-toggle" title="Recolher" type="button" onClick={() => setCollapsed(true)}>
            <PanelRightClose size={16} />
          </button>
        </div>
      </div>

      <form className="todo-form" onSubmit={addTodo}>
        <input placeholder="Nova tarefa..." value={newText} onChange={(event) => setNewText(event.target.value)} />
        <button aria-label="Adicionar tarefa" className="button primary" disabled={!newText.trim()} type="submit">
          <Plus size={16} />
        </button>
      </form>

      {sorted.length === 0 ? <p className="todo-empty">Nenhuma tarefa. Adicione a primeira acima.</p> : null}

      <ul className="todo-list">
        {sorted.map((todo) => (
          <li className={todo.done ? "todo-done" : undefined} key={todo.id}>
            {editingId === todo.id ? (
              <div className="todo-edit">
                <input
                  autoFocus
                  value={editText}
                  onChange={(event) => setEditText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") saveEdit(todo.id);
                    if (event.key === "Escape") setEditingId(null);
                  }}
                />
                <button aria-label="Salvar" className="todo-action" type="button" onClick={() => saveEdit(todo.id)}>
                  <Check size={14} />
                </button>
                <button aria-label="Cancelar edição" className="todo-action" type="button" onClick={() => setEditingId(null)}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <label className="todo-item">
                  <input checked={todo.done} type="checkbox" onChange={() => toggleTodo(todo.id)} />
                  <span>{todo.text}</span>
                </label>
                <div className="todo-item-actions">
                  {!todo.done ? (
                    <button aria-label="Editar tarefa" className="todo-action" title="Editar" type="button" onClick={() => startEdit(todo)}>
                      <Pencil size={14} />
                    </button>
                  ) : null}
                  <button aria-label="Excluir tarefa" className="todo-action" title="Excluir" type="button" onClick={() => removeTodo(todo.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {todos.some((todo) => todo.done) ? (
        <button className="button todo-clear" type="button" onClick={clearDone}>
          Limpar concluídas
        </button>
      ) : null}
    </aside>
  );
};
