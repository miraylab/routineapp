import { useEffect, useState } from "react";
import { Flag, Save, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProjectAction, Task } from "@/data/mockData";
import { cn } from "@/lib/utils";

type EditableTask = Pick<Task | ProjectAction, "id" | "title" | "quick" | "visibleFrom" | "recurrence" | "dueDate">;

export function TaskEditDialog({
  task,
  open,
  onOpenChange,
  onSave,
  onDelete,
}: {
  task: EditableTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    id: string,
    input: Partial<Pick<Task, "title" | "quick" | "visibleFrom" | "recurrence" | "dueDate">>,
  ) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [quick, setQuick] = useState(false);
  const [visibleFrom, setVisibleFrom] = useState("");
  const [recurrence, setRecurrence] = useState<NonNullable<Task["recurrence"]>>("none");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!task || !open) return;
    setTitle(task.title);
    setQuick(Boolean(task.quick));
    setVisibleFrom(task.visibleFrom ?? "");
    setRecurrence(task.recurrence ?? "none");
    setConfirmDelete(false);
  }, [open, task]);

  if (!task) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) setConfirmDelete(false);
      }}
    >
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[430px] rounded-3xl border-border/60 bg-card p-5">
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-base">Editar tarefa</DialogTitle>
          <DialogDescription>Altere os detalhes desta tarefa.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-2.5"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = title.trim();
            if (!trimmed) return;
            onSave(task.id, {
              title: trimmed,
              quick,
              visibleFrom: visibleFrom || undefined,
              recurrence,
            });
            onOpenChange(false);
          }}
        >
          <textarea
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Descreva a tarefa"
            className="app-scrollbar h-28 w-full resize-none rounded-2xl bg-elevated/50 px-4 py-3 text-[15px] leading-snug outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
          />
          <div className="grid grid-cols-[48px_1fr] gap-2">
            <button
              type="button"
              onClick={() => setQuick((value) => !value)}
              className={cn(
                "press grid size-12 shrink-0 place-items-center rounded-2xl border",
                quick ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
              )}
              aria-label="Marcar como tarefa rápida"
              title="Menos de 5 minutos"
            >
              <Flag className="size-4" />
            </button>
            <input
              type="date"
              value={visibleFrom}
              onChange={(event) => setVisibleFrom(event.target.value)}
              className="h-12 min-w-0 rounded-2xl bg-elevated/50 px-3.5 text-[13px] text-foreground outline-none focus:ring-1 focus:ring-ring"
              aria-label="Data de aparição"
            />
          </div>
          <select
            value={recurrence}
            onChange={(event) =>
              setRecurrence(event.target.value as NonNullable<Task["recurrence"]>)
            }
            className="h-12 w-full min-w-0 rounded-2xl bg-elevated/50 px-3.5 text-[13px] text-foreground outline-none focus:ring-1 focus:ring-ring"
            aria-label="Recorrência"
          >
            <option value="none">Sem recorrência</option>
            <option value="daily">Diária</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensal</option>
          </select>
          <button
            type="submit"
            disabled={!title.trim()}
            className="press flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
          >
            <Save className="size-4" />
            Salvar tarefa
          </button>
          <button
            type="button"
            onClick={() => {
              if (!confirmDelete) {
                setConfirmDelete(true);
                return;
              }
              onDelete(task.id);
              onOpenChange(false);
            }}
            className="press flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-destructive/25 bg-destructive/10 px-4 text-sm font-medium text-destructive"
          >
            <Trash2 className="size-4" />
            {confirmDelete ? "Confirmar apagar tarefa" : "Apagar tarefa"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
