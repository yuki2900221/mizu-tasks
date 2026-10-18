import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useMotionValue,
  useTransform,
} from "motion/react";
import {
  ArrowUp,
  ArrowRight,
  ArrowLeft,
  Plus,
  Search,
  SlidersHorizontal,
  Inbox,
  Sun,
  Check,
  CheckCheck,
  Circle,
  MoreHorizontal,
  X,
  CalendarDays,
  Sparkles,
  ChevronDown,
  ArrowUpRight,
  Cloud,
  CloudOff,
  Settings,
  LogOut,
  Trash2,
  Download,
  Keyboard,
  ChevronRight,
  RotateCcw,
  LoaderCircle,
  PanelLeft,
  Play,
  WifiOff,
} from "lucide-react";
import {
  type Task,
  type Status,
  type Category,
  labels,
  newTask,
  filterTasks,
  localDate,
  readTasks,
  stepStatus,
} from "./model";

type User = { id: string; name: string; email: string };
type Config = { google: boolean; ai: boolean; cloud: boolean };
const navs = [
  { id: "all", label: "すべて", icon: Inbox },
  { id: "today", label: "今日", icon: Sun },
  { id: "doing", label: "進行中", icon: Play },
  { id: "done", label: "完了", icon: CheckCheck },
];
async function api<T = Record<string, unknown>>(
  path: string,
  init?: RequestInit,
) {
  const r = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!r.ok) {
    let error = "接続できませんでした";
    try {
      error = ((await r.json()) as { error?: string }).error || error;
    } catch {}
    throw new Error(error);
  }
  return r.json() as Promise<T>;
}
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.4Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-.9 6.7-2.4l-3.2-2.5c-.9.6-2.1 1-3.5 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 14a6 6 0 0 1 0-4V7.4H3.1a10 10 0 0 0 0 9.2Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.9c1.5 0 2.9.5 4 1.6l3-3A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1Z"
      />
    </svg>
  );
}
function Drop({ small = false }: { small?: boolean }) {
  return (
    <img className={small ? "drop small" : "drop"} src="/icon.svg" alt="" />
  );
}
function StatusIcon({ status }: { status: Status }) {
  return status === "done" ? (
    <Check size={17} />
  ) : status === "doing" ? (
    <span className="half-circle" />
  ) : (
    <Circle size={17} />
  );
}
function TaskCard({
  task,
  onUpdate,
  onOpen,
}: {
  task: Task;
  onUpdate: (t: Task) => void;
  onOpen: () => void;
}) {
  const x = useMotionValue(0);
  const rightOpacity = useTransform(x, [15, 75], [0, 1]);
  const leftOpacity = useTransform(x, [-75, -15], [1, 0]);
  const dragging = useRef(false);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, height: 0, marginBottom: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className={`task-wrap ${task.status}`}
    >
      <motion.div
        style={{ opacity: rightOpacity }}
        className="swipe-action right"
        aria-hidden="true"
      >
        <ArrowRight size={18} />
        {labels[stepStatus(task.status, 1)]}
      </motion.div>
      <motion.div
        style={{ opacity: leftOpacity }}
        className="swipe-action left"
        aria-hidden="true"
      >
        {labels[stepStatus(task.status, -1)]}
        <ArrowLeft size={18} />
      </motion.div>
      <motion.article
        className="task-card glass"
        data-task-id={task.id}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.65}
        dragMomentum={false}
        style={{ x, touchAction: "pan-y" }}
        onDragStart={() => {
          dragging.current = true;
        }}
        onDragEnd={(_, info) => {
          if (Math.abs(info.offset.x) > 75) {
            onUpdate({
              ...task,
              status: stepStatus(task.status, info.offset.x > 0 ? 1 : -1),
            });
            navigator.vibrate?.(10);
          }
          setTimeout(() => {
            dragging.current = false;
          }, 100);
        }}
      >
        <button
          className={`status-button ${task.status}`}
          aria-label={`${task.title}：${labels[task.status]}。次の状態へ`}
          onClick={() =>
            onUpdate({
              ...task,
              status: stepStatus(task.status, task.status === "done" ? -2 : 1),
            })
          }
        >
          <StatusIcon status={task.status} />
        </button>
        <button
          className="task-body"
          onClick={() => {
            if (!dragging.current) onOpen();
          }}
        >
          <span className="task-title">{task.title}</span>
          <span className="task-meta">
            <span
              className={`tag-dot ${task.category === "仕事" ? "work" : ""}`}
            />
            {task.category}
            {task.due && (
              <>
                <span className="meta-divider" />
                <span
                  className={
                    task.due < localDate() && task.status !== "done"
                      ? "overdue"
                      : ""
                  }
                >
                  <CalendarDays size={11} />
                  {task.due === localDate()
                    ? "今日"
                    : new Date(task.due + "T00:00:00").toLocaleDateString(
                        "ja-JP",
                        { month: "numeric", day: "numeric" },
                      )}
                </span>
              </>
            )}
            {task.note && <span className="note-indicator">メモあり</span>}
          </span>
        </button>
        <span className={`status-badge ${task.status}`}>
          {labels[task.status]}
        </span>
        <button
          className="icon-button task-more"
          aria-label={`${task.title}を編集`}
          onClick={onOpen}
        >
          <MoreHorizontal size={19} />
        </button>
      </motion.article>
    </motion.div>
  );
}
function Sheet({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const box = useRef<HTMLElement>(null);
  const previous = useRef<HTMLElement | null>(null);
  useEffect(() => {
    previous.current = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    box.current?.focus();
    return () => {
      document.body.style.overflow = old;
      previous.current?.focus();
    };
  }, []);
  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={close}
    >
      <motion.section
        ref={box}
        tabIndex={-1}
        className="sheet glass"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ y: 40, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 360, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
          if (e.key === "Tab") {
            const els = box.current?.querySelectorAll<HTMLElement>(
              "button:not(:disabled),input,textarea,select,a[href]",
            );
            if (els?.length) {
              const first = els[0],
                last = els[els.length - 1];
              if (
                e.shiftKey &&
                (document.activeElement === first ||
                  document.activeElement === box.current)
              ) {
                e.preventDefault();
                last.focus();
              } else if (
                !e.shiftKey &&
                (document.activeElement === last ||
                  document.activeElement === box.current)
              ) {
                e.preventDefault();
                first.focus();
              }
            }
          }
        }}
      >
        <div className="sheet-handle" />
        <header className="sheet-header">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="閉じる" onClick={close}>
            <X size={20} />
          </button>
        </header>
        {children}
      </motion.section>
    </motion.div>
  );
}
export default function App() {
  const [data, setData] = useState(() => ({
    key: "mizu:tasks:guest",
    items: readTasks("mizu:tasks:guest"),
  }));
  const tasks = data.items;
  const [draft, setDraft] = useState(() => {
    try {
      return localStorage.getItem("mizu:draft") || "";
    } catch {
      return "";
    }
  });
  const [category, setCategory] = useState<Category>("パーソナル");
  const [due, setDue] = useState("");
  const [view, setView] = useState("all");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState(false);
  const [settings, setSettings] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<
    { title: string; due: string }[]
  >([]);
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<Config>({
    google: false,
    ai: false,
    cloud: false,
  });
  const [loading, setLoading] = useState(true);
  const [sync, setSync] = useState("local");
  const [syncTick, setSyncTick] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
  const [toast, setToast] = useState("");
  const [undo, setUndo] = useState<Task | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [scope, setScope] = useState<"all" | "personal" | "work">("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const syncFingerprint = useRef("");
  const lastSyncTick = useRef(-1);
  const notify = (message: string) => setToast(message);
  useEffect(() => {
    let active = true;
    Promise.all([
      api<Config>("/api/config"),
      api<{ user: User | null }>("/api/me"),
    ])
      .then(([conf, me]) => {
        if (!active) return;
        setConfig(conf);
        if (me.user) {
          const key = `mizu:tasks:${me.user.id}`;
          const personal = readTasks(key);
          setData((current) => {
            const guest =
              current.key === "mizu:tasks:guest"
                ? current.items
                : readTasks("mizu:tasks:guest");
            const merged = [
              ...personal,
              ...guest.filter((t) => !personal.some((p) => p.id === t.id)),
            ];
            return { key, items: merged };
          });
          setUser(me.user);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    const on = () => {
        setOnline(true);
        setSyncTick((t) => t + 1);
      },
      off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      active = false;
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(data.key, JSON.stringify(tasks));
      if (data.key !== "mizu:tasks:guest")
        localStorage.removeItem("mizu:tasks:guest");
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [data, tasks]);
  useEffect(() => {
    try {
      localStorage.setItem("mizu:draft", draft);
    } catch {
      setStorageError(true);
    }
  }, [draft]);
  useEffect(() => {
    if (!user || !online) return;
    const fingerprint = JSON.stringify(tasks);
    if (
      fingerprint === syncFingerprint.current &&
      lastSyncTick.current === syncTick
    )
      return;
    lastSyncTick.current = syncTick;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSync("syncing");
      api<{ tasks: Task[] }>("/api/tasks/sync", {
        method: "POST",
        body: JSON.stringify({ tasks }),
        signal: controller.signal,
      })
        .then(({ tasks: remote }) => {
          setData((current) => {
            const merged = new Map<string, Task>(
              current.items.map((t) => [t.id, t]),
            );
            for (const t of remote as Task[]) {
              const local = merged.get(t.id);
              if (!local || t.updatedAt > local.updatedAt) merged.set(t.id, t);
            }
            const items = [...merged.values()];
            syncFingerprint.current = JSON.stringify(items);
            return JSON.stringify(items) === JSON.stringify(current.items)
              ? current
              : { ...current, items };
          });
          setSync("synced");
        })
        .catch((e) => {
          if (e.name !== "AbortError") setSync("error");
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [tasks, user, online, syncTick]);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") setSyncTick((t) => t + 1);
    };
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  useEffect(() => {
    if (new URLSearchParams(location.search).get("auth") === "failed")
      setToast("Googleログインが完了しませんでした。もう一度お試しください");
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast("");
      setUndo(null);
    }, 5500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(
        (e.target as HTMLElement).tagName,
      );
      if (e.key === "Escape") {
        setSearch(false);
        setSettings(false);
        setEditing(null);
        setAiOpen(false);
        setFilterOpen(false);
        input.current?.blur();
      }
      if (
        (e.key === "k" && (e.metaKey || e.ctrlKey)) ||
        (!typing && e.key === "/")
      ) {
        e.preventDefault();
        setSearch(true);
        setTimeout(() => searchInput.current?.focus(), 0);
      }
      if (!typing && e.key === "n") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    const t = newTask(draft, category, due);
    setData((d) => ({ ...d, items: [t, ...d.items] }));
    setDraft("");
    setDue("");
    setView("all");
    setScope("all");
    setQuery("");
    notify("保存しました");
    input.current?.focus();
  };
  const update = (task: Task) => {
    const updated = {
      ...task,
      updatedAt: Math.max(Date.now(), task.updatedAt + 1),
    };
    setData((d) => ({
      ...d,
      items: d.items.map((t) => (t.id === task.id ? updated : t)),
    }));
    if (task.status === "done") notify("完了にしました");
  };
  const remove = (task: Task) => {
    update({ ...task, deleted: true });
    setEditing(null);
    setUndo(task);
    notify("削除しました");
  };
  const visible = filterTasks(tasks, view, query).filter(
    (t) =>
      scope === "all" ||
      t.category === (scope === "work" ? "仕事" : "パーソナル"),
  );
  const live = tasks.filter((t) => !t.deleted);
  const completed = live.filter((t) => t.status === "done").length;
  const percent = live.length ? Math.round((completed / live.length) * 100) : 0;
  const today = new Date().toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const organize = async () => {
    if (!aiText.trim() || aiBusy) return;
    setAiBusy(true);
    setSuggestions([]);
    try {
      const result = await api<{ tasks: { title: string; due: string }[] }>(
        "/api/ai/organize",
        {
          method: "POST",
          body: JSON.stringify({ text: aiText, today: localDate() }),
        },
      );
      setSuggestions(result.tasks);
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setAiBusy(false);
    }
  };
  const exportTasks = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(live, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `mizu-${localDate()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify("書き出しました");
  };
  return (
    <MotionConfig reducedMotion="user">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="noise" />
      <div className="app-shell">
        <aside className="sidebar">
          <a className="brand" href="/" aria-label="mizu ホーム">
            <Drop />
            <span>
              mizu<span className="brand-dot">.</span>
            </span>
          </a>
          <div className="sidebar-section-label">ワークスペース</div>
          <nav className="side-nav" aria-label="メインナビゲーション">
            {navs.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  setView(n.id);
                  setQuery("");
                }}
                className={view === n.id ? "active" : ""}
                aria-current={view === n.id ? "page" : undefined}
              >
                <n.icon size={19} />
                <span>{n.label}</span>
                <span className="nav-count">
                  {filterTasks(tasks, n.id, "").length}
                </span>
              </button>
            ))}
          </nav>
          <div className="sidebar-separator" />
          <div className="sidebar-section-label">スペース</div>
          <button
            className={`space-button ${scope === "personal" ? "selected" : ""}`}
            onClick={() => {
              setScope("personal");
              setView("all");
            }}
          >
            <span className="space-icon personal" />
            パーソナル
            <span>
              {live.filter((t) => t.category === "パーソナル").length}
            </span>
          </button>
          <button
            className={`space-button ${scope === "work" ? "selected" : ""}`}
            onClick={() => {
              setScope("work");
              setView("all");
            }}
          >
            <span className="space-icon work" />
            仕事<span>{live.filter((t) => t.category === "仕事").length}</span>
          </button>
          <div className="sidebar-bottom">
            <button className="settings-link" onClick={() => setSettings(true)}>
              <Settings size={18} />
              設定<span className="keyboard-tag">⌘ K</span>
            </button>
            <button
              className="profile-card glass"
              onClick={() => setSettings(true)}
            >
              <span className="avatar">
                {user ? user.name.slice(0, 1) : <Circle size={17} />}
              </span>
              <span>
                <strong>{user?.name || "ローカルワークスペース"}</strong>
                <small>{user ? "Google アカウント" : "この端末に保存"}</small>
              </span>
              <ChevronDown size={15} />
            </button>
          </div>
        </aside>
        <main className="main-content">
          <header className="topbar">
            <div className="mobile-brand">
              <Drop small />
              <span>mizu.</span>
            </div>
            <span className="breadcrumb">
              <PanelLeft size={14} />
              ワークスペース
              <ChevronRight size={12} />
              <b>{navs.find((n) => n.id === view)?.label || "すべて"}</b>
            </span>
            <div className="topbar-actions">
              <span className="save-state">
                {!online ? (
                  <WifiOff size={14} />
                ) : user ? (
                  <Cloud size={14} />
                ) : (
                  <span className="saved-dot" />
                )}
                {!online
                  ? "オフライン"
                  : user
                    ? sync === "syncing"
                      ? "同期中"
                      : sync === "error"
                        ? "同期を再試行してください"
                        : "クラウド同期"
                    : "端末に保存"}
              </span>
              <button
                className="icon-button"
                aria-label="検索"
                onClick={() => {
                  setSearch((s) => !s);
                  setTimeout(() => searchInput.current?.focus(), 0);
                }}
              >
                <Search size={19} />
              </button>
              <button
                className="icon-button mobile-settings"
                aria-label="設定"
                onClick={() => setSettings(true)}
              >
                <Settings size={19} />
              </button>
            </div>
          </header>
          <div className="workspace">
            <section className="primary-column">
              <div className="page-heading">
                <div>
                  <p className="date-label">{today}</p>
                  <h1>
                    {view === "today"
                      ? "今日のタスク"
                      : view === "done"
                        ? "完了したタスク"
                        : view === "doing"
                          ? "進行中のタスク"
                          : "メモとタスク"}
                    <span className="heading-dot" />
                  </h1>
                </div>
                <span className="heading-count">
                  {live.filter((t) => t.status !== "done").length}
                  <small>未完了</small>
                </span>
              </div>
              <form className="composer glass" onSubmit={add}>
                <div className="composer-heading">
                  <span className="composer-mark">
                    <Plus size={17} />
                  </span>
                  <span>クイックメモ</span>
                  <span className="composer-shortcut">N</span>
                </div>
                <textarea
                  ref={input}
                  autoFocus
                  aria-label="新しいメモ"
                  placeholder="今、浮かんだことを…"
                  maxLength={500}
                  rows={2}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey &&
                      !e.nativeEvent.isComposing
                    ) {
                      e.preventDefault();
                      add(e);
                    }
                  }}
                />
                <div className="composer-footer">
                  <div className="composer-options">
                    <label className="category-select">
                      <span
                        className={`tag-dot ${category === "仕事" ? "work" : ""}`}
                      />
                      <select
                        aria-label="スペース"
                        value={category}
                        onChange={(e) =>
                          setCategory(e.target.value as Category)
                        }
                      >
                        <option>パーソナル</option>
                        <option>仕事</option>
                      </select>
                      <ChevronDown size={12} />
                    </label>
                    <label
                      className={`due-control ${due ? "has-date" : ""}`}
                      title="期限を設定"
                    >
                      <CalendarDays size={15} />
                      <input
                        aria-label="期限"
                        type="date"
                        value={due}
                        onInput={(e) => setDue(e.currentTarget.value)}
                        onChange={(e) => setDue(e.target.value)}
                      />
                    </label>
                  </div>
                  <span className="enter-hint">Enter で保存</span>
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    className="add-button"
                    type="submit"
                    aria-label="メモを保存"
                    disabled={!draft.trim()}
                  >
                    <ArrowUp size={20} />
                  </motion.button>
                </div>
              </form>
              {storageError && (
                <div className="error-notice" role="alert">
                  端末に保存できません。設定から書き出してデータを保管してください。
                </div>
              )}
              <AnimatePresence>
                {search && (
                  <motion.div
                    className="search-box glass"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 48, opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <Search size={17} />
                    <input
                      ref={searchInput}
                      aria-label="タスクを検索"
                      placeholder="メモとタスクを検索"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    <button
                      className="icon-button"
                      aria-label="検索を閉じる"
                      onClick={() => {
                        setQuery("");
                        setSearch(false);
                      }}
                    >
                      <X size={16} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              <section className="tasks-section" aria-label="タスク一覧">
                <div className="list-toolbar">
                  <div
                    className="segment-control glass"
                    role="tablist"
                    aria-label="タスクの表示"
                  >
                    {[
                      { id: "all", name: "すべて" },
                      { id: "todo", name: "未着手" },
                      { id: "doing", name: "進行中" },
                      { id: "done", name: "完了" },
                    ].map((n) => (
                      <button
                        key={n.id}
                        role="tab"
                        aria-selected={view === n.id}
                        onClick={() => setView(n.id)}
                        className={view === n.id ? "selected" : ""}
                      >
                        {view === n.id && (
                          <motion.span
                            className="segment-highlight"
                            layoutId="segment"
                            transition={{
                              type: "spring",
                              bounce: 0.2,
                              duration: 0.35,
                            }}
                          />
                        )}
                        <span>{n.name}</span>
                        {n.id === "all" && (
                          <span className="tab-count">{live.length}</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="filter-wrapper">
                    <button
                      className={`icon-button filter-button ${scope !== "all" ? "filtered" : ""}`}
                      aria-label="表示フィルター"
                      aria-expanded={filterOpen}
                      onClick={() => setFilterOpen((v) => !v)}
                    >
                      <SlidersHorizontal size={17} />
                    </button>
                    {filterOpen && (
                      <div className="filter-popover glass">
                        <button
                          onClick={() => {
                            setScope("all");
                            setFilterOpen(false);
                          }}
                        >
                          全スペース{scope === "all" && <Check size={14} />}
                        </button>
                        <button
                          onClick={() => {
                            setScope("work");
                            setFilterOpen(false);
                          }}
                        >
                          仕事のみ{scope === "work" && <Check size={14} />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="list-subheading">
                  <span>
                    {scope !== "all"
                      ? scope === "work"
                        ? "仕事"
                        : "パーソナル"
                      : view === "today"
                        ? "今日が期限"
                        : "タスク"}
                    <span className="sub-count">{visible.length}</span>
                  </span>
                  <span>
                    作成順 <ChevronDown size={12} />
                  </span>
                </div>
                <div className="task-list">
                  {loading && tasks.length === 0 ? (
                    <div
                      className="list-skeleton"
                      role="status"
                      aria-label="タスクを読み込み中"
                    >
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="skeleton-card">
                          <i />
                          <span />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <AnimatePresence mode="popLayout" initial={false}>
                      {visible.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onUpdate={update}
                          onOpen={() => setEditing({ ...task })}
                        />
                      ))}
                    </AnimatePresence>
                  )}
                  {!loading && visible.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="empty-state"
                    >
                      <div className="empty-art">
                        <span className="empty-orbit" />
                        <div className="empty-glass">
                          <CheckCheck size={31} strokeWidth={1.4} />
                        </div>
                        <span className="empty-spark" />
                      </div>
                      <h3>
                        {query
                          ? "一致するタスクはありません"
                          : view === "done"
                            ? "完了したタスクはありません"
                            : view === "doing"
                              ? "進行中のタスクはありません"
                              : view === "today"
                                ? "今日が期限のタスクはありません"
                                : "タスクはありません"}
                      </h3>
                      {!query && (
                        <button
                          className="subtle-link"
                          onClick={() => input.current?.focus()}
                        >
                          メモを追加
                          <Plus size={14} />
                        </button>
                      )}
                    </motion.div>
                  )}
                </div>
                <div className="swipe-hint">
                  <span>
                    <ArrowLeft size={13} />
                    戻す
                  </span>
                  <span className="swipe-line" />
                  <span>フリックでステータス変更</span>
                  <span className="swipe-line" />
                  <span>
                    進める
                    <ArrowRight size={13} />
                  </span>
                </div>
              </section>
              <footer className="workspace-footer">
                <span>
                  <span className="tiny-drop" />
                  mizu
                </span>
                <span>
                  {live.length} タスク<span className="footer-dot">·</span>
                  {completed} 完了
                </span>
                <button
                  onClick={() => setSettings(true)}
                  aria-label="キーボードショートカット"
                >
                  <Keyboard size={16} />
                </button>
              </footer>
            </section>
            <aside className="insights-column">
              <section className="overview glass">
                <div className="panel-title">
                  <span>
                    <Sun size={16} />
                    今日のステータス
                  </span>
                  <MoreHorizontal size={18} />
                </div>
                <div className="progress-visual">
                  <svg
                    viewBox="0 0 160 160"
                    aria-label={`全タスクの完了率 ${percent}%`}
                  >
                    <defs>
                      <linearGradient id="progress" x1="0" x2="1" y1="0" y2="1">
                        <stop stopColor="#95c6fb" />
                        <stop offset="1" stopColor="#4387ef" />
                      </linearGradient>
                    </defs>
                    <circle className="ring-bg" cx="80" cy="80" r="65" />
                    <motion.circle
                      className="ring-fill"
                      cx="80"
                      cy="80"
                      r="65"
                      stroke="url(#progress)"
                      strokeDasharray="408.41"
                      animate={{
                        strokeDashoffset: 408.41 * (1 - percent / 100),
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 55,
                        damping: 18,
                      }}
                    />
                  </svg>
                  <div className="progress-text">
                    <span>
                      {percent}
                      <small>%</small>
                    </span>
                    <p>全タスクの完了率</p>
                  </div>
                </div>
                <div className="overview-stats">
                  {(["todo", "doing", "done"] as Status[]).map((s) => (
                    <div key={s}>
                      <span className={`stat-dot ${s}`} />
                      <strong>
                        {live.filter((t) => t.status === s).length}
                      </strong>
                      <small>{labels[s]}</small>
                    </div>
                  ))}
                </div>
              </section>
              <button
                className="ai-card glass"
                onClick={() => {
                  setAiText(draft);
                  setAiOpen(true);
                }}
              >
                <span className="ai-icon">
                  <Sparkles size={21} />
                </span>
                <span>
                  <strong>AIで整理</strong>
                  <small>メモをタスクに分解</small>
                </span>
                <ArrowUpRight size={18} />
              </button>
              <section className="gesture-guide">
                <div className="guide-label">フリック操作</div>
                <div className="gesture-demo">
                  <span>
                    <ArrowLeft size={16} />
                  </span>
                  <motion.div
                    animate={{ x: [0, 12, 0, -12, 0] }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      repeatDelay: 5,
                    }}
                  >
                    <span className="mini-status" />
                    <i />
                    <i />
                  </motion.div>
                  <span>
                    <ArrowRight size={16} />
                  </span>
                </div>
                <div className="gesture-labels">
                  <span>前のステータスへ</span>
                  <span>次のステータスへ</span>
                </div>
                <div className="status-flow">
                  <span>未着手</span>
                  <ChevronRight size={11} />
                  <span>進行中</span>
                  <ChevronRight size={11} />
                  <span>完了</span>
                </div>
              </section>
              <div className="local-note">
                <CloudOff size={14} />
                <span>
                  {user
                    ? "Google アカウントで同期中"
                    : "ログインせずにメモできます"}
                  <button onClick={() => setSettings(true)}>
                    {user ? "アカウント設定" : "Googleで同期する"}
                    <ArrowUpRight size={11} />
                  </button>
                </span>
              </div>
            </aside>
          </div>
        </main>
      </div>
      <nav className="bottom-nav glass" aria-label="モバイルナビゲーション">
        {navs.map((n) => (
          <button
            key={n.id}
            className={view === n.id ? "active" : ""}
            onClick={() => {
              setView(n.id);
              setQuery("");
            }}
            aria-label={n.label}
          >
            <n.icon size={20} />
            <span>{n.label}</span>
            {view === n.id && <motion.i layoutId="mobile-dot" />}
          </button>
        ))}
        <button
          className="mobile-ai"
          onClick={() => {
            setAiText(draft);
            setAiOpen(true);
          }}
          aria-label="AIで整理"
        >
          <Sparkles size={21} />
          <span>AI</span>
        </button>
      </nav>
      <AnimatePresence>
        {editing && (
          <Sheet title="タスクを編集" close={() => setEditing(null)}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editing.title.trim()) {
                  update({ ...editing, title: editing.title.trim() });
                  setEditing(null);
                  notify("変更を保存しました");
                }
              }}
            >
              <label className="field-label">
                タスク
                <input
                  className="text-field"
                  aria-label="タスク名"
                  value={editing.title}
                  maxLength={500}
                  required
                  onChange={(e) =>
                    setEditing({ ...editing, title: e.target.value })
                  }
                />
              </label>
              <label className="field-label">
                メモ
                <textarea
                  className="text-field detail-note"
                  aria-label="詳細メモ"
                  placeholder="詳細を追加…"
                  maxLength={5000}
                  value={editing.note}
                  onChange={(e) =>
                    setEditing({ ...editing, note: e.target.value })
                  }
                />
              </label>
              <div className="field-row">
                <label className="field-label">
                  ステータス
                  <select
                    className="text-field"
                    aria-label="ステータス"
                    value={editing.status}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        status: e.target.value as Status,
                      })
                    }
                  >
                    {Object.entries(labels).map(([v, l]) => (
                      <option value={v} key={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label">
                  期限
                  <input
                    className="text-field"
                    aria-label="編集する期限"
                    type="date"
                    value={editing.due}
                    onInput={(e) =>
                      setEditing({ ...editing, due: e.currentTarget.value })
                    }
                    onChange={(e) =>
                      setEditing({ ...editing, due: e.target.value })
                    }
                  />
                </label>
              </div>
              <label className="field-label">
                スペース
                <select
                  className="text-field"
                  aria-label="編集するスペース"
                  value={editing.category}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      category: e.target.value as Category,
                    })
                  }
                >
                  <option>パーソナル</option>
                  <option>仕事</option>
                </select>
              </label>
              <div className="sheet-actions">
                <button
                  type="button"
                  className="icon-button delete-button"
                  aria-label="タスクを削除"
                  onClick={() => remove(editing)}
                >
                  <Trash2 size={19} />
                </button>
                <button
                  className="primary-button"
                  disabled={!editing.title.trim()}
                >
                  変更を保存
                  <Check size={16} />
                </button>
              </div>
            </form>
          </Sheet>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {settings && (
          <Sheet title="設定" close={() => setSettings(false)}>
            <div className="account-section">
              <span className="avatar large">
                {user ? user.name.slice(0, 1) : <Drop small />}
              </span>
              <strong>{user?.name || "ローカルワークスペース"}</strong>
              <p>{user?.email || "メモはこのブラウザに保存されています。"}</p>
            </div>
            {user ? (
              <button
                className="google-button"
                onClick={async () => {
                  try {
                    await api("/auth/logout", { method: "POST" });
                    location.reload();
                  } catch {
                    notify("ログアウトできませんでした");
                  }
                }}
              >
                <LogOut size={17} />
                ログアウト
              </button>
            ) : config.google ? (
              <a className="google-button" href="/auth/google">
                <GoogleIcon />
                Googleでログイン
              </a>
            ) : (
              <>
                <button className="google-button" disabled>
                  <GoogleIcon />
                  Googleでログイン
                </button>
                <p className="setting-note">
                  Google認証は未接続です。CloudflareとGoogle
                  Cloudの設定後に利用できます。
                </p>
              </>
            )}
            <div className="settings-rows">
              <div>
                <span>
                  <Cloud size={17} />
                  保存先
                </span>
                <strong>{user ? "Cloudflare D1" : "この端末"}</strong>
              </div>
              <div>
                <span>
                  <Sparkles size={17} />
                  Workers AI
                </span>
                <strong>{config.ai ? "接続済み" : "未接続"}</strong>
              </div>
              <button onClick={exportTasks}>
                <span>
                  <Download size={17} />
                  タスクを書き出す
                </span>
                <ArrowUpRight size={16} />
              </button>
            </div>
            <div className="shortcuts">
              <span>
                <Keyboard size={16} />
                ショートカット
              </span>
              <div>
                <kbd>N</kbd>メモを入力<kbd>⌘ K</kbd>検索
              </div>
              <div>
                <kbd>Enter</kbd>保存<kbd>Shift ↵</kbd>改行
              </div>
            </div>
            <div className="settings-version">
              <Drop small />
              mizu<span>1.0.0</span>
            </div>
          </Sheet>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {aiOpen && (
          <Sheet title="AIで整理" close={() => setAiOpen(false)}>
            <p className="ai-description">
              入力したメモをWorkers
              AIでタスクに分解します。内容は実行時にCloudflareへ送信されます。
            </p>
            <textarea
              className="text-field ai-textarea"
              aria-label="AIで整理するメモ"
              placeholder="来週の打ち合わせ準備、資料の確認、買い物…"
              maxLength={5000}
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
            />
            {!config.ai && (
              <p className="setting-note">
                Workers AIは未接続です。アカウント設定後に利用できます。
              </p>
            )}
            {config.ai && !user && (
              <p className="setting-note">利用にはGoogleログインが必要です。</p>
            )}
            <button
              className="primary-button full"
              disabled={!config.ai || !user || !aiText.trim() || aiBusy}
              onClick={organize}
            >
              {aiBusy ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Sparkles size={17} />
              )}
              タスクに分解
            </button>
            {suggestions.length > 0 && (
              <div className="suggestions">
                {suggestions.map((s, i) => (
                  <div key={i}>
                    <Check size={15} />
                    <span>{s.title}</span>
                    {s.due && <small>{s.due}</small>}
                  </div>
                ))}
                <button
                  className="primary-button full"
                  onClick={() => {
                    setData((d) => ({
                      ...d,
                      items: [
                        ...suggestions.map((s) =>
                          newTask(s.title, category, s.due),
                        ),
                        ...d.items,
                      ],
                    }));
                    setSuggestions([]);
                    setAiOpen(false);
                    setView("all");
                    notify("タスクを追加しました");
                  }}
                >
                  {suggestions.length}件を追加
                  <Plus size={16} />
                </button>
              </div>
            )}
          </Sheet>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast glass"
            role="status"
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0 }}
          >
            <span className="toast-check">
              <Check size={13} />
            </span>
            {toast}
            {undo && (
              <button
                onClick={() => {
                  update({ ...undo, deleted: false });
                  setUndo(null);
                  notify("元に戻しました");
                }}
              >
                <RotateCcw size={13} />
                元に戻す
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
