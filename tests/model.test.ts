import { describe, it, expect } from "vitest";
import { newTask, stepStatus, filterTasks, localDate } from "../src/model";
describe("task behavior", () => {
  it("trims input and creates unique tasks", () => {
    const a = newTask("  メモ  "),
      b = newTask("メモ");
    expect(a.title).toBe("メモ");
    expect(a.id).not.toBe(b.id);
    expect(a.status).toBe("todo");
  });
  it("advances and reverses all states without crossing boundaries", () => {
    expect(stepStatus("todo", 1)).toBe("doing");
    expect(stepStatus("doing", 1)).toBe("done");
    expect(stepStatus("done", 1)).toBe("done");
    expect(stepStatus("done", -1)).toBe("doing");
    expect(stepStatus("doing", -1)).toBe("todo");
    expect(stepStatus("todo", -1)).toBe("todo");
  });
  it("filters status, dates, deleted records and case-insensitive notes", () => {
    const a = newTask("A", "仕事", localDate()),
      b = { ...newTask("B"), status: "doing" as const, note: "Meeting" },
      c = { ...newTask("C"), deleted: true };
    expect(filterTasks([a, b, c], "all", "")).toHaveLength(2);
    expect(filterTasks([a, b, c], "today", "")).toEqual([a]);
    expect(filterTasks([a, b, c], "doing", "meeting")).toEqual([b]);
    expect(filterTasks([a, b, c], "done", "")).toEqual([]);
  });
  it("uses local calendar dates rather than UTC", () => {
    const d = new Date(2026, 9, 18, 0, 5);
    expect(localDate(d)).toBe("2026-10-18");
  });
});
