export type Status = "todo" | "doing" | "done";
export type Category = "パーソナル" | "仕事";
export interface Task {
  id: string;
  title: string;
  note: string;
  status: Status;
  category: Category;
  due: string;
  createdAt: number;
  updatedAt: number;
  deleted: boolean;
}
export const statuses: Status[] = ["todo", "doing", "done"];
export const labels: Record<Status, string> = {
  todo: "未着手",
  doing: "進行中",
  done: "完了",
};
export function stepStatus(status: Status, direction: number): Status {
  return statuses[
    Math.max(0, Math.min(2, statuses.indexOf(status) + direction))
  ];
}
export function newTask(
  title: string,
  category: Category = "パーソナル",
  due = "",
): Task {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: title.trim(),
    note: "",
    status: "todo",
    category,
    due,
    createdAt: now,
    updatedAt: now,
    deleted: false,
  };
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function filterTasks(tasks: Task[], view: string, query: string) {
  return tasks
    .filter(
      (t) =>
        !t.deleted &&
        (view === "all" ||
          (view === "today" ? t.due === localDate() : t.status === view)) &&
        (!query ||
          `${t.title} ${t.note} ${t.category}`
            .toLocaleLowerCase()
            .includes(query.toLocaleLowerCase())),
    )
    .sort((a, b) => b.createdAt - a.createdAt);
}
export function readTasks(key: string): Task[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}
