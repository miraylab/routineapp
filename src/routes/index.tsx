import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  BriefcaseBusiness,
  BusFront,
  CalendarCheck,
  Check,
  ChevronDown,
  Dumbbell,
  Flag,
  Heart,
  House,
  LocateFixed,
  Mic,
  Plane,
  Plus,
  Send,
  X,
} from "lucide-react";

import {
  CurrentActivityCard,
  getActivityChecklist,
  type ActivityChecklistItem,
} from "@/components/yuri/CurrentActivityCard";
import { useStore, type ManagedFront } from "@/lib/store";
import {
  MONTHS,
  WEEKDAYS,
  blocksForDate,
  blocksForDay,
  formatMinutes,
  greetingFor,
  toMinutes,
  type CurrentActivity,
} from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { type ScheduleBlock, type Task } from "@/data/mockData";
import type { FixedPlace } from "@/lib/supabasePlaces";

const BEDTIME_MINUTES = toMinutes("21:30");
const FREE_TIME_ID_PREFIX = "tempo-livre";
const RELIEF_NOTES_ACTIVITY_ID = "pessoal-notas-de-alivio";
const FIXED_PLACE_RADIUS_METERS = 200;
const BRASILIA_RADIUS_METERS = 60_000;

type TravelIconKind = FixedPlace["kind"] | "calendar" | "airport";

interface TravelDestination {
  place: FixedPlace;
  iconKind: TravelIconKind;
  reason: "time_window" | "agenda" | "away_from_home" | "brasilia";
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hoje · YURI OS" },
      {
        name: "description",
        content:
          "Painel operacional pessoal: veja o que fazer agora, prioridades do dia e rotina completa.",
      },
      { property: "og:title", content: "Hoje · YURI OS" },
      {
        property: "og:description",
        content: "Painel operacional pessoal: agora, prioridades e rotina do dia.",
      },
    ],
  }),
  component: HojePage,
});

function HojePage() {
  const {
    hydrated,
    context,
    scheduleBlocks,
    todayKey,
    nowMinutes,
    dayOfWeek,
    realNow,
    tasks,
    fronts,
    projects,
    dailyHabits,
    dailyJournalEntries,
    weekMilestones,
    fixedPlaces,
    routineRatingsToday,
    blockDone,
    dailyHabitDone,
    weekMilestoneDone,
    activityChecklistItemDone,
    activityChecklistItemCompletedAt,
    extraActivityChecklistItems,
    toggleDailyHabit,
    toggleWeekMilestone,
    toggleActivityChecklistItem,
    toggleTask,
    toggleProjectAction,
    addActivityChecklistItem,
    addActivityLearningEntry,
    addActivityLearningAudioEntry,
    setRoutineRating,
    addDailyJournalEntry,
    addDailyJournalAudioEntry,
    materializeScheduleScope,
    addTask,
    addReliefNoteAudioEntry,
  } = useStore();
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalDraft, setJournalDraft] = useState("");
  const [reliefNoteComposerOpen, setReliefNoteComposerOpen] = useState(false);
  const [reliefNoteDraft, setReliefNoteDraft] = useState("");
  const [reliefNoteQuick, setReliefNoteQuick] = useState(false);
  const [isRecordingReliefAudio, setIsRecordingReliefAudio] = useState(false);
  const [pendingReliefAudio, setPendingReliefAudio] = useState<{
    blob: Blob;
    mimeType: string;
    url: string;
  } | null>(null);
  const [openMilestoneId, setOpenMilestoneId] = useState<string | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [fastTasksDismissed, setFastTasksDismissed] = useState(false);
  const [isRecordingJournalAudio, setIsRecordingJournalAudio] = useState(false);
  const [pendingJournalAudio, setPendingJournalAudio] = useState<{
    blob: Blob;
    mimeType: string;
    url: string;
  } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "ready" | "denied" | "error">("idle");
  const [currentPosition, setCurrentPosition] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null>(null);
  const [routeTravelTimes, setRouteTravelTimes] = useState<Record<string, number>>({});
  const [geocodedAgendaPlaces, setGeocodedAgendaPlaces] = useState<Record<string, FixedPlace>>({});
  const journalMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const journalAudioChunksRef = useRef<BlobPart[]>([]);
  const journalRecordingStreamRef = useRef<MediaStream | null>(null);
  const reliefMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const reliefAudioChunksRef = useRef<BlobPart[]>([]);
  const reliefRecordingStreamRef = useRef<MediaStream | null>(null);

  const { current, dayBlocks } = context;
  const activeFreeTimeBlock = useMemo(
    () => buildActiveFreeTimeBlock(dayBlocks, dayOfWeek, todayKey, nowMinutes, current),
    [current, dayBlocks, dayOfWeek, nowMinutes, todayKey],
  );
  const finalFreeTimeBlock = useMemo(
    () => buildFinalFreeTimeBlock(dayBlocks, dayOfWeek, todayKey, nowMinutes),
    [dayBlocks, dayOfWeek, nowMinutes, todayKey],
  );
  const freeTimeBlock = activeFreeTimeBlock ?? finalFreeTimeBlock;
  const carouselBlocks = useMemo(
    () => buildCarouselBlocks(dayBlocks, activeFreeTimeBlock, finalFreeTimeBlock),
    [activeFreeTimeBlock, dayBlocks, finalFreeTimeBlock],
  );
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(current?.id ?? null);
  const focusedIndex = focusedBlockId
    ? carouselBlocks.findIndex((block) => block.id === focusedBlockId)
    : current
      ? carouselBlocks.findIndex((block) => block.id === current.id)
      : freeTimeBlock
        ? carouselBlocks.findIndex((block) => block.id === freeTimeBlock.id)
        : -1;
  const focusedBlock = focusedIndex >= 0 ? (carouselBlocks[focusedIndex] ?? null) : null;
  const focusedContext = useMemo(
    () =>
      focusedBlock
        ? buildFocusedActivityContext(context, focusedBlock, nowMinutes)
        : freeTimeBlock
          ? buildFocusedActivityContext(
              {
                ...context,
                current: freeTimeBlock,
                next: context.next,
              },
              freeTimeBlock,
              nowMinutes,
            )
          : context,
    [context, focusedBlock, freeTimeBlock, nowMinutes],
  );
  const focusedCurrent = focusedContext.current;
  const focusedProject = focusedCurrent?.projectId
    ? projects.find((p) => p.id === focusedCurrent.projectId)
    : undefined;
  const focusedMode =
    focusedBlock && isFreeTimeBlock(focusedBlock) && !current
      ? "current"
      : focusedBlock && current?.id === focusedBlock.id
        ? "current"
        : focusedBlock && toMinutes(focusedBlock.endTime) <= nowMinutes
          ? "past"
          : "future";
  const previousFocusedSlide = focusedIndex > 0 ? (carouselBlocks[focusedIndex - 1] ?? null) : null;
  const nextFocusedSlide =
    focusedIndex >= 0 && focusedIndex < carouselBlocks.length - 1
      ? (carouselBlocks[focusedIndex + 1] ?? null)
      : null;
  const activityIndicators = useMemo(
    () => buildActivityIndicators(carouselBlocks, current, focusedBlock, activeFreeTimeBlock),
    [activeFreeTimeBlock, carouselBlocks, current, focusedBlock],
  );
  const reliefNotesFront = useMemo(
    () =>
      fronts.find(
        (front) =>
          front.area === "Pessoal" &&
          normalizeLabel(front.title) === normalizeLabel("Notas de Alívio"),
      ),
    [fronts],
  );
  const personalTaskItems = useMemo(
    () => buildPersonalTaskItems(tasks, fronts, projects, todayKey),
    [fronts, projects, tasks, todayKey],
  );
  const currentWeekStart = useMemo(() => getCurrentWeekStartKey(realNow), [realNow]);
  const currentWeekMilestones = useMemo(
    () =>
      weekMilestones.filter(
        (milestone) => (milestone.weekStart ?? currentWeekStart) === currentWeekStart,
      ),
    [currentWeekStart, weekMilestones],
  );
  const carouselExtraChecklistItems = useMemo(
    () => mergeReliefNotesIntoFreeTimeBlocks(carouselBlocks, extraActivityChecklistItems, personalTaskItems),
    [carouselBlocks, extraActivityChecklistItems, personalTaskItems],
  );
  const focusedExtraChecklistItems = useMemo(() => {
    if (!focusedCurrent) return [];

    const currentItems = extraActivityChecklistItems[focusedCurrent.id] ?? [];
    if (!isFreeTimeBlock(focusedCurrent)) return currentItems;

    return [
      ...personalTaskItems,
      ...(extraActivityChecklistItems[RELIEF_NOTES_ACTIVITY_ID] ?? []),
      ...currentItems,
    ];
  }, [extraActivityChecklistItems, focusedCurrent, personalTaskItems]);
  const fastTasks = useMemo(
    () =>
      buildFastTasks(
        carouselBlocks,
        extraActivityChecklistItems,
        tasks,
        fronts,
        projects,
        activityChecklistItemDone,
        activityChecklistItemCompletedAt,
        todayKey,
      ),
    [
      activityChecklistItemCompletedAt,
      activityChecklistItemDone,
      carouselBlocks,
      extraActivityChecklistItems,
      fronts,
      projects,
      tasks,
      todayKey,
    ],
  );
  const openFastTasks = fastTasks.filter((task) => !task.done).length;
  const showFastTasks = fastTasks.length > 0 && !(fastTasksDismissed && openFastTasks === 0);

  useEffect(() => {
    setFocusedBlockId(current?.id ?? activeFreeTimeBlock?.id ?? null);
  }, [activeFreeTimeBlock?.id, current?.id]);

  useEffect(() => {
    if (openFastTasks > 0) setFastTasksDismissed(false);
  }, [openFastTasks]);

  useEffect(() => {
    setSelectedDateKey(todayKey);
  }, [todayKey]);

  useEffect(
    () => () => {
      const recorder = journalMediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }
      if (pendingJournalAudio) {
        URL.revokeObjectURL(pendingJournalAudio.url);
      }
      const reliefRecorder = reliefMediaRecorderRef.current;
      if (reliefRecorder && reliefRecorder.state !== "inactive") {
        reliefRecorder.onstop = null;
        reliefRecorder.stop();
      }
      if (pendingReliefAudio) {
        URL.revokeObjectURL(pendingReliefAudio.url);
      }
      reliefRecordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      journalRecordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [pendingJournalAudio, pendingReliefAudio],
  );

  const orderedDailyHabits = useMemo(
    () => orderItemsByDoneLast(dailyHabits, (habit) => dailyHabitDone(habit.id)),
    [dailyHabitDone, dailyHabits],
  );
  const openDailyHabits = orderedDailyHabits.filter((habit) => !dailyHabitDone(habit.id)).length;
  const visibleDays = useMemo(() => buildVisibleDays(realNow), [realNow]);
  const selectedDayInfo =
    visibleDays.find((day) => day.dateKey === selectedDateKey) ?? visibleDays[0];
  const selectedDayBlocks = useMemo(
    () =>
      selectedDayInfo
        ? blocksForDate(scheduleBlocks, selectedDayInfo.dateKey, selectedDayInfo.dayOfWeek)
        : [],
    [scheduleBlocks, selectedDayInfo],
  );

  const weekdayLabel = WEEKDAYS[dayOfWeek];
  const fullDateLabel = `${realNow.getDate()} de ${MONTHS[realNow.getMonth()]}`;
  const agendaLocationsToGeocode = useMemo(
    () => getAgendaLocationsToGeocode(fixedPlaces, dayBlocks, todayKey, nowMinutes),
    [dayBlocks, fixedPlaces, nowMinutes, todayKey],
  );
  const travelPlaces = useMemo(
    () => [...fixedPlaces, ...Object.values(geocodedAgendaPlaces)],
    [fixedPlaces, geocodedAgendaPlaces],
  );
  const travelDestinations = useMemo(
    () => getSuggestedTravelDestinations(travelPlaces, currentPosition, dayBlocks, todayKey, dayOfWeek, nowMinutes),
    [currentPosition, dayBlocks, dayOfWeek, nowMinutes, todayKey, travelPlaces],
  );
  const travelHints = useMemo(
    () => buildTravelHints(currentPosition, travelDestinations),
    [currentPosition, travelDestinations],
  );
  const travelPositionKey = currentPosition ? buildTravelPositionKey(currentPosition) : null;
  const handleAddReliefNote = () => {
    if (!reliefNoteDraft.trim()) return;
    if (reliefNotesFront) {
      addTask(reliefNoteDraft.trim(), `pessoal.${reliefNotesFront.id}`, { quick: reliefNoteQuick });
    } else {
      addActivityChecklistItem(RELIEF_NOTES_ACTIVITY_ID, reliefNoteDraft.trim(), reliefNoteQuick);
    }
    setReliefNoteDraft("");
    setReliefNoteQuick(false);
    setReliefNoteComposerOpen(false);
  };
  const handleToggleReliefAudioRecording = useCallback(async () => {
    const activeRecorder = reliefMediaRecorderRef.current;
    if (activeRecorder?.state === "recording") {
      activeRecorder.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      reliefRecordingStreamRef.current = stream;
      reliefAudioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          reliefAudioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(reliefAudioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setPendingReliefAudio((currentAudio) => {
          if (currentAudio) URL.revokeObjectURL(currentAudio.url);
          return { blob, mimeType, url };
        });
        stream.getTracks().forEach((track) => track.stop());
        if (reliefRecordingStreamRef.current === stream) {
          reliefRecordingStreamRef.current = null;
        }
        reliefMediaRecorderRef.current = null;
        reliefAudioChunksRef.current = [];
        setIsRecordingReliefAudio(false);
      };

      reliefMediaRecorderRef.current = recorder;
      setIsRecordingReliefAudio(true);
      recorder.start();
    } catch {
      setIsRecordingReliefAudio(false);
      reliefRecordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      reliefRecordingStreamRef.current = null;
      reliefMediaRecorderRef.current = null;
      reliefAudioChunksRef.current = [];
    }
  }, []);
  const handleSendReliefAudio = useCallback(() => {
    if (!pendingReliefAudio) return;
    addReliefNoteAudioEntry(pendingReliefAudio.blob, pendingReliefAudio.mimeType);
    URL.revokeObjectURL(pendingReliefAudio.url);
    setPendingReliefAudio(null);
    setReliefNoteComposerOpen(false);
  }, [addReliefNoteAudioEntry, pendingReliefAudio]);
  const handleDeleteReliefAudio = useCallback(() => {
    if (!pendingReliefAudio) return;
    URL.revokeObjectURL(pendingReliefAudio.url);
    setPendingReliefAudio(null);
  }, [pendingReliefAudio]);
  const handleToggleJournalAudioRecording = useCallback(async () => {
    const activeRecorder = journalMediaRecorderRef.current;
    if (activeRecorder?.state === "recording") {
      activeRecorder.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      journalRecordingStreamRef.current = stream;
      journalAudioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          journalAudioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(journalAudioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setPendingJournalAudio((currentAudio) => {
          if (currentAudio) URL.revokeObjectURL(currentAudio.url);
          return { blob, mimeType, url };
        });
        stream.getTracks().forEach((track) => track.stop());
        if (journalRecordingStreamRef.current === stream) {
          journalRecordingStreamRef.current = null;
        }
        journalMediaRecorderRef.current = null;
        journalAudioChunksRef.current = [];
        setIsRecordingJournalAudio(false);
      };

      journalMediaRecorderRef.current = recorder;
      setIsRecordingJournalAudio(true);
      recorder.start();
    } catch {
      setIsRecordingJournalAudio(false);
      journalRecordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      journalRecordingStreamRef.current = null;
      journalMediaRecorderRef.current = null;
      journalAudioChunksRef.current = [];
    }
  }, []);
  const handleSendJournalAudio = useCallback(() => {
    if (!pendingJournalAudio) return;
    addDailyJournalAudioEntry(pendingJournalAudio.blob, pendingJournalAudio.mimeType, formatMinutes(nowMinutes));
    URL.revokeObjectURL(pendingJournalAudio.url);
    setPendingJournalAudio(null);
  }, [addDailyJournalAudioEntry, nowMinutes, pendingJournalAudio]);
  const handleDeleteJournalAudio = useCallback(() => {
    if (!pendingJournalAudio) return;
    URL.revokeObjectURL(pendingJournalAudio.url);
    setPendingJournalAudio(null);
  }, [pendingJournalAudio]);

  const requestGpsLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setGpsStatus("error");
      return;
    }

    setGpsStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setGpsStatus("ready");
      },
      (error) => {
        setGpsStatus(error.code === error.PERMISSION_DENIED ? "denied" : "error");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 10_000,
      },
    );
  }, []);

  useEffect(() => {
    if (!hydrated || gpsStatus !== "idle" || !("geolocation" in navigator)) return;

    if (!navigator.permissions?.query) return;

    let active = true;

    navigator.permissions
      .query({ name: "geolocation" })
      .then((permission) => {
        if (!active || permission.state !== "granted") return;
        requestGpsLocation();
      })
      .catch(() => {
        /* Sem Permissions API, evita abrir prompt automaticamente. */
      });

    return () => {
      active = false;
    };
  }, [gpsStatus, hydrated, requestGpsLocation]);

  useEffect(() => {
    const pendingLocations = agendaLocationsToGeocode.filter(
      (location) => !geocodedAgendaPlaces[normalizeLabel(location)],
    );
    if (pendingLocations.length === 0) return;

    const controller = new AbortController();

    Promise.all(
      pendingLocations.map(async (location) => {
        const url = new URL("/api/geocode", window.location.origin);
        url.searchParams.set("address", location);

        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) return null;
        const payload = (await response.json()) as {
          available?: boolean;
          formattedAddress?: string;
          latitude?: number;
          longitude?: number;
        };
        if (
          !payload.available ||
          typeof payload.latitude !== "number" ||
          typeof payload.longitude !== "number"
        ) {
          return null;
        }

        const key = normalizeLabel(location);
        return [
          key,
          {
            id: `agenda:${key}`,
            label: payload.formattedAddress ?? location,
            kind: "other" as const,
            address: payload.formattedAddress ?? location,
            latitude: payload.latitude,
            longitude: payload.longitude,
            active: true,
          },
        ] as const;
      }),
    )
      .then((entries) => {
        const validEntries = entries.filter(Boolean) as Array<readonly [string, FixedPlace]>;
        if (validEntries.length === 0) return;
        setGeocodedAgendaPlaces((current) => ({
          ...current,
          ...Object.fromEntries(validEntries),
        }));
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
      });

    return () => controller.abort();
  }, [agendaLocationsToGeocode, geocodedAgendaPlaces]);

  useEffect(() => {
    if (travelHints.length === 0 || !currentPosition || !travelPositionKey) {
      setRouteTravelTimes({});
      return;
    }

    const controller = new AbortController();

    Promise.all(
      travelHints.map(async (hint) => {
        const url = new URL("/api/travel-time", window.location.origin);
        url.searchParams.set("originLat", String(currentPosition.latitude));
        url.searchParams.set("originLng", String(currentPosition.longitude));
        url.searchParams.set("destinationLat", String(hint.destination.place.latitude));
        url.searchParams.set("destinationLng", String(hint.destination.place.longitude));

        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) return null;
        const payload = (await response.json()) as { available?: boolean; minutes?: number };
        if (!payload.available || typeof payload.minutes !== "number") return null;
        return [hint.key, payload.minutes] as const;
      }),
    )
      .then((entries) => {
        setRouteTravelTimes(Object.fromEntries(entries.filter(Boolean) as Array<readonly [string, number]>));
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
      });

    return () => controller.abort();
  }, [currentPosition, travelHints, travelPositionKey]);

  if (!hydrated) {
    return (
      <div className="space-y-3">
        <section className="h-48 animate-pulse rounded-2xl bg-card" />
        <section className="h-[600px] animate-pulse rounded-3xl bg-card" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <header className="rise rounded-2xl bg-primary p-5 text-primary-foreground shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 max-w-[170px]">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {greetingFor(nowMinutes)}, Yuri
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {travelHints.length > 0 ? (
                travelHints.map((hint) => {
                  const minutes = routeTravelTimes[hint.key] ?? hint.minutes;
                  return (
                    <button
                      key={hint.key}
                      type="button"
                      onClick={requestGpsLocation}
                      disabled={gpsStatus === "loading"}
                      className="press inline-flex h-8 items-center gap-2 rounded-xl bg-black/10 px-2.5 text-sm font-semibold text-primary-foreground/90 transition-colors hover:bg-black/15 disabled:opacity-70"
                      aria-label={`Tempo estimado até ${hint.destination.place.label}: ${minutes} minutos`}
                      title={`${minutes} min até ${hint.destination.place.label}`}
                    >
                      <TravelPlaceIcon destination={hint.destination} className="size-4" />
                      <span className="tabular">{gpsStatus === "loading" ? "..." : `${minutes} min`}</span>
                    </button>
                  );
                })
              ) : gpsStatus !== "ready" ? (
                <button
                  type="button"
                  onClick={requestGpsLocation}
                  disabled={gpsStatus === "loading"}
                  className="press inline-flex h-8 items-center gap-2 rounded-xl bg-black/10 px-2.5 text-sm font-semibold text-primary-foreground/90 transition-colors hover:bg-black/15 disabled:opacity-70"
                  aria-label="Atualizar localização"
                  title={
                    gpsStatus === "denied"
                      ? "GPS bloqueado"
                      : gpsStatus === "error"
                        ? "GPS indisponível"
                        : "Atualizar localização"
                  }
                >
                  <LocateFixed className={cn("size-4", gpsStatus === "loading" && "animate-pulse")} />
                  <span className="tabular">{gpsStatus === "loading" ? "..." : "GPS"}</span>
                </button>
              ) : null}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="tabular text-2xl font-semibold tracking-tight">
              {formatMinutes(nowMinutes)}
            </p>
            <p className="max-w-24 text-xs leading-tight text-primary-foreground/70">
              {fullDateLabel},
              <br />
              {weekdayLabel}
            </p>
          </div>
        </div>
      </header>

      {showFastTasks ? (
        <section className="rounded-3xl border-2 border-primary/35 bg-card p-5 shadow-[0_18px_40px_rgba(0,0,0,0.16)]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-medium tracking-[0.18em] text-primary">
              TAREFAS RÁPIDAS
            </p>
            {openFastTasks === 0 ? (
              <button
                type="button"
                onClick={() => setFastTasksDismissed(true)}
                className="press grid size-8 shrink-0 place-items-center rounded-xl bg-elevated/60 text-muted-foreground"
                aria-label="Fechar tarefas rápidas concluídas"
              >
                <X className="size-4" />
              </button>
            ) : (
              <p className="tabular text-sm text-muted-foreground">{openFastTasks} abertas</p>
            )}
          </div>

          <div className="app-scrollbar mt-4 max-h-[218px] space-y-2 overflow-y-auto pr-1">
            {fastTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() =>
                  task.source === "task" ? toggleTask(task.id) : toggleActivityChecklistItem(task.id)
                }
                className="press flex w-full items-start gap-3 rounded-2xl bg-elevated/55 px-3.5 py-3 text-left"
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-200",
                    task.done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-transparent",
                  )}
                >
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-[13px] font-medium leading-snug text-foreground",
                      task.done && "text-muted-foreground line-through",
                    )}
                  >
                    {task.title}
                  </span>
                  <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                    {task.context}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <CurrentActivityCard
        context={focusedContext}
        project={focusedProject}
        done={focusedCurrent ? blockDone(focusedCurrent.id) : false}
        activityIndicators={activityIndicators}
        nowMinutes={nowMinutes}
        todayKey={todayKey}
        projects={projects}
        fronts={fronts}
        tasks={tasks}
        blockDoneById={blockDone}
        checklistItemDone={activityChecklistItemDone}
        checklistItemCompletedAt={activityChecklistItemCompletedAt}
        routineRatings={routineRatingsToday}
        extraChecklistItemsByActivity={carouselExtraChecklistItems}
        extraChecklistItems={focusedExtraChecklistItems}
        onToggleChecklistItem={toggleActivityChecklistItem}
        onToggleTask={toggleTask}
        onToggleProjectAction={toggleProjectAction}
        onAddChecklistItem={(title, priority) =>
          focusedCurrent &&
          (isFreeTimeBlock(focusedCurrent) && reliefNotesFront
            ? addTask(title, `pessoal.${reliefNotesFront.id}`, { quick: priority })
            : addActivityChecklistItem(focusedCurrent.id, title, priority))
        }
        onMaterializeScheduleScope={materializeScheduleScope}
        onAddLearningNote={(text) =>
          focusedCurrent && addActivityLearningEntry(focusedCurrent.id, text, formatMinutes(nowMinutes))
        }
        onAddLearningAudio={(audioBlob, mimeType) =>
          focusedCurrent &&
          addActivityLearningAudioEntry(
            focusedCurrent.id,
            focusedCurrent.projectId,
            audioBlob,
            mimeType,
            formatMinutes(nowMinutes),
          )
        }
        onSetRoutineRating={setRoutineRating}
        viewMode={focusedMode}
        previousSlide={previousFocusedSlide}
        nextSlide={nextFocusedSlide}
        canNavigatePrevious={Boolean(previousFocusedSlide)}
        canNavigateNext={Boolean(nextFocusedSlide)}
        onNavigatePrevious={() =>
          setFocusedBlockId(previousFocusedSlide ? previousFocusedSlide.id : focusedBlockId)
        }
        onNavigateNext={() =>
          setFocusedBlockId(nextFocusedSlide ? nextFocusedSlide.id : focusedBlockId)
        }
      />

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
            CONSTRUÇÃO DE HÁBITOS
          </p>
          <p className="tabular text-sm text-muted-foreground">
            {openDailyHabits} abertos
          </p>
        </div>

        <div className="mt-4 space-y-2">
          {orderedDailyHabits.map((habit) => {
            const done = dailyHabitDone(habit.id);
            const streakDays = habit.streakDays ?? 0;
            return (
              <button
                key={habit.id}
                type="button"
                onClick={() => toggleDailyHabit(habit.id)}
                className={cn(
                  "press flex w-full items-center gap-3 rounded-2xl bg-elevated/50 px-4 py-3.5 text-left transition-colors duration-200",
                  done && "bg-primary/10",
                )}
              >
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-200",
                    done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/35 text-transparent",
                  )}
                >
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 text-sm font-medium leading-snug text-foreground",
                    done && "text-muted-foreground line-through",
                  )}
                >
                  {habit.title}
                </span>
                <span
                  className={cn(
                    "tabular grid size-10 shrink-0 place-items-center rounded-xl bg-card/65 text-sm font-semibold text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
                    done && "bg-primary/15 text-primary",
                  )}
                  aria-label={`${streakDays} dias consecutivos`}
                >
                  {streakDays}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 rounded-2xl bg-primary/10 p-3.5 shadow-[0_12px_28px_rgba(0,0,0,0.10)]">
          <button
            type="button"
            onClick={() => setJournalOpen((open) => !open)}
            className="press flex w-full items-center justify-between gap-3 rounded-2xl px-1 text-left"
            aria-expanded={journalOpen}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                <BookOpen className="size-4" />
              </span>
              <span className="block min-w-0 truncate text-[11px] font-medium tracking-[0.18em] text-primary">
                BLOCO DE NOTAS
              </span>
            </span>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-primary transition-transform duration-200",
                journalOpen && "rotate-180",
              )}
            />
          </button>
          {journalOpen && (
            <div className="mt-3 space-y-3">
              <form
                className="space-y-2.5"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!journalDraft.trim()) return;
                  addDailyJournalEntry(journalDraft, formatMinutes(nowMinutes));
                  setJournalDraft("");
                }}
              >
                <textarea
                  value={journalDraft}
                  onChange={(event) => setJournalDraft(event.target.value)}
                  placeholder="Como foi seu dia?"
                  className="app-scrollbar h-24 w-full resize-none rounded-2xl bg-card/70 px-3.5 py-3 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleToggleJournalAudioRecording}
                    disabled={Boolean(pendingJournalAudio)}
                    className={cn(
                      "press grid size-11 shrink-0 place-items-center rounded-2xl border transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-45",
                      isRecordingJournalAudio
                        ? "border-primary bg-primary text-primary-foreground shadow-[0_0_22px_rgba(55,220,184,0.34)]"
                        : "border-border bg-card/70 text-muted-foreground",
                    )}
                    aria-label={isRecordingJournalAudio ? "Parar gravação" : "Gravar áudio"}
                  >
                    <Mic className={cn("size-4", isRecordingJournalAudio && "live-dot")} />
                  </button>
                  <button
                    type="submit"
                    disabled={!journalDraft.trim()}
                    className="press flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                    aria-label="Enviar registro do bloco de notas"
                  >
                    <Send className="size-4" />
                    Enviar
                  </button>
                </div>
                {pendingJournalAudio ? (
                  <div className="w-full space-y-2 overflow-hidden rounded-2xl bg-card/70 p-2">
                    <audio
                      controls
                      src={pendingJournalAudio.url}
                      className="h-9 w-full min-w-0 max-w-full"
                    />
                    <div className="grid grid-cols-[40px_1fr] gap-2">
                      <button
                        type="button"
                        onClick={handleDeleteJournalAudio}
                        className="press grid size-10 place-items-center rounded-2xl border border-border text-muted-foreground"
                        aria-label="Apagar áudio"
                      >
                        <X className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleSendJournalAudio}
                        className="press flex h-10 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground"
                        aria-label="Enviar áudio"
                      >
                        <Send className="size-4" />
                        Enviar áudio
                      </button>
                    </div>
                  </div>
                ) : null}
              </form>

              {dailyJournalEntries.length > 0 && (
                <div className="app-scrollbar max-h-40 space-y-2 overflow-y-auto pr-1">
                  {dailyJournalEntries
                    .slice()
                    .reverse()
                    .map((entry) => (
                      <div
                        key={entry.id}
                        className="grid grid-cols-[44px_1fr] gap-3 rounded-2xl bg-card/60 px-3.5 py-3"
                      >
                        <span className="tabular text-xs font-medium text-primary">
                          {entry.time}
                        </span>
                        {entry.type === "audio" && entry.audioDataUrl ? (
                          <div className="min-w-0">
                            <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                              Áudio
                            </p>
                            <audio
                              controls
                              src={entry.audioDataUrl}
                              className="h-9 w-full min-w-0"
                            />
                          </div>
                        ) : (
                          <p className="text-sm leading-snug text-foreground">{entry.text}</p>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl bg-primary p-5 text-primary-foreground shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium tracking-[0.18em] text-primary-foreground/70">
            FOCO DA SEMANA
          </p>
          {dayOfWeek === 0 || currentWeekMilestones.length === 0 ? (
            <Link
              to="/mais/foco-da-semana"
              className="press rounded-full bg-primary-foreground/18 px-3 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-primary-foreground/86"
            >
              {currentWeekMilestones.length > 0 ? "Editar foco" : "Adicionar foco"}
            </Link>
          ) : null}
        </div>
        <div className="mt-4 space-y-2">
          {currentWeekMilestones.map((milestone) => {
            const open = openMilestoneId === milestone.id;
            const done = weekMilestoneDone(milestone.id);
            return (
              <button
                key={milestone.id}
                type="button"
                onClick={() => setOpenMilestoneId(open ? null : milestone.id)}
                className="press w-full overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.42),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.22),rgba(0,125,98,0.28))] px-3.5 py-3 text-left text-primary-foreground shadow-[0_12px_28px_rgba(0,0,0,0.16)] transition-colors duration-300"
                aria-expanded={open}
              >
                <span className="flex items-center gap-3">
                  <span className="shrink-0 rounded-full bg-primary-foreground/18 px-2.5 py-1 text-[11px] font-semibold tracking-[0.12em] text-primary-foreground/82">
                    {milestone.dayLabel}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 text-sm font-medium leading-snug",
                      done && "text-primary-foreground/68 line-through",
                    )}
                  >
                    {milestone.title}
                  </span>
                </span>
                {open ? (
                  <span className="mt-2.5 block">
                    {milestone.detail ? (
                      <span className="block text-sm leading-snug text-primary-foreground/78">
                        {milestone.detail}
                      </span>
                    ) : null}
                    <span
                      role="checkbox"
                      aria-checked={done}
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleWeekMilestone(milestone.id);
                        setOpenMilestoneId(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        event.stopPropagation();
                        toggleWeekMilestone(milestone.id);
                        setOpenMilestoneId(null);
                      }}
                      className={cn(
                        "press mt-3 flex h-10 w-full items-center justify-center rounded-2xl text-xs font-semibold tracking-[0.16em] transition-colors duration-200",
                        done
                          ? "bg-primary-foreground/18 text-primary-foreground/72"
                          : "bg-primary-foreground text-primary",
                      )}
                    >
                      {done ? "CONCLUÍDO" : "CONCLUIR"}
                    </span>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
          VISÃO DOS DIAS
        </p>
        <div className="app-scrollbar -mx-1 mt-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {visibleDays.map((day) => (
            <button
              key={day.dateKey}
              type="button"
              onClick={() => setSelectedDateKey(day.dateKey)}
              className={cn(
                "press h-11 min-w-12 flex-1 rounded-2xl text-xs font-medium transition-colors",
                selectedDateKey === day.dateKey
                  ? "bg-primary text-primary-foreground"
                  : "bg-elevated/50 text-muted-foreground",
              )}
            >
              {day.label}
            </button>
          ))}
        </div>

        <ul className="app-scrollbar mt-4 max-h-64 divide-y divide-border/60 overflow-y-auto pr-1">
          {selectedDayBlocks.map((block) => (
            <li key={block.id} className="flex items-center gap-4 py-2.5">
              <span className="tabular w-11 shrink-0 text-sm text-muted-foreground">
                {block.startTime}
              </span>
              <span className="min-w-0 truncate text-sm">{block.title}</span>
            </li>
          ))}
          {selectedDayBlocks.length === 0 ? (
            <li className="py-3 text-sm text-muted-foreground">Dia livre de compromissos.</li>
          ) : null}
        </ul>
      </section>

      <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+86px)] right-[max(1rem,calc((100vw-430px)/2+1rem))] z-40 flex flex-col items-end gap-2">
          {reliefNoteComposerOpen ? (
            <form
              className="rise w-[min(320px,calc(100vw-2rem))] rounded-3xl border border-border/60 bg-card p-3 shadow-[0_18px_46px_rgba(0,0,0,0.42)]"
              onSubmit={(event) => {
                event.preventDefault();
                handleAddReliefNote();
              }}
            >
              <textarea
                value={reliefNoteDraft}
                onChange={(event) => setReliefNoteDraft(event.target.value)}
                placeholder="Nova nota de alívio"
                className="app-scrollbar h-24 w-full resize-none rounded-2xl bg-elevated/60 px-3.5 py-3 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setReliefNoteQuick((quick) => !quick)}
                  className={cn(
                    "press grid size-10 shrink-0 place-items-center rounded-2xl transition-colors duration-200",
                    reliefNoteQuick
                      ? "bg-primary text-primary-foreground"
                      : "bg-elevated/60 text-muted-foreground",
                  )}
                  aria-label="Marcar como tarefa rápida"
                  aria-pressed={reliefNoteQuick}
                >
                  <Flag className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={handleToggleReliefAudioRecording}
                  disabled={Boolean(pendingReliefAudio)}
                  className={cn(
                    "press grid size-10 shrink-0 place-items-center rounded-2xl border transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-45",
                    isRecordingReliefAudio
                      ? "border-primary bg-primary text-primary-foreground shadow-[0_0_22px_rgba(55,220,184,0.34)]"
                      : "border-border bg-elevated/60 text-muted-foreground",
                  )}
                  aria-label={isRecordingReliefAudio ? "Parar gravação" : "Gravar áudio"}
                >
                  <Mic className={cn("size-4", isRecordingReliefAudio && "live-dot")} />
                </button>
                <button
                  type="submit"
                  disabled={!reliefNoteDraft.trim()}
                  className="press flex h-10 flex-1 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                >
                  Adicionar
                </button>
              </div>
              {pendingReliefAudio ? (
                <div className="mt-2 w-full space-y-2 overflow-hidden rounded-2xl bg-elevated/60 p-2">
                  <audio
                    controls
                    src={pendingReliefAudio.url}
                    className="h-9 w-full min-w-0 max-w-full"
                  />
                  <div className="grid grid-cols-[40px_1fr] gap-2">
                    <button
                      type="button"
                      onClick={handleDeleteReliefAudio}
                      className="press grid size-10 place-items-center rounded-2xl border border-border text-muted-foreground"
                      aria-label="Apagar áudio"
                    >
                      <X className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleSendReliefAudio}
                      className="press flex h-10 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                      aria-label="Enviar áudio"
                    >
                      <Send className="size-4" />
                      Enviar áudio
                    </button>
                  </div>
                </div>
              ) : null}
            </form>
          ) : null}
          <button
            type="button"
            onClick={() => setReliefNoteComposerOpen((open) => !open)}
            className="press grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_16px_34px_rgba(0,0,0,0.34)]"
            aria-label="Adicionar nota de alívio"
            aria-expanded={reliefNoteComposerOpen}
          >
            <Plus
              className={cn(
                "size-6 transition-transform duration-200",
                reliefNoteComposerOpen && "rotate-45",
              )}
            />
          </button>
      </div>
    </div>
  );
}

function buildFocusedActivityContext(
  context: CurrentActivity,
  block: ScheduleBlock,
  nowMinutes: number,
): CurrentActivity {
  const start = toMinutes(block.startTime);
  const end = toMinutes(block.endTime);
  const progress =
    end > start ? Math.min(100, Math.max(0, ((nowMinutes - start) / (end - start)) * 100)) : 0;

  return {
    ...context,
    current: block,
    start,
    end,
    progress,
    remaining: Math.max(0, end - nowMinutes),
  };
}

interface FastTask extends ActivityChecklistItem {
  context: string;
  source: "checklist" | "task";
  done?: boolean;
}

function buildFastTasks(
  dayBlocks: ScheduleBlock[],
  extraItemsByActivity: Record<string, ActivityChecklistItem[]>,
  tasks: Task[],
  fronts: ManagedFront[],
  projects: Project[],
  checklistItemDone: (id: string) => boolean,
  checklistItemCompletedAt: (id: string) => string | undefined,
  todayKey: string,
): FastTask[] {
  const reliefFastTasks = (extraItemsByActivity[RELIEF_NOTES_ACTIVITY_ID] ?? [])
    .filter((item) =>
      item.priority
        && checklistFastTaskIsVisibleToday(
          item,
          checklistItemDone,
          checklistItemCompletedAt,
          todayKey,
        ),
    )
    .map((item) => ({
      ...item,
      priority: true,
      context: "Pessoal · Notas de Alívio",
      source: "checklist" as const,
      done: checklistItemDone(item.id),
    }));

  const checklistFastTasks = dayBlocks.flatMap((block) => {
    const items = [...getActivityChecklist(block), ...(extraItemsByActivity[block.id] ?? [])];

    return items
      .filter((item) =>
        item.priority
          && checklistFastTaskIsVisibleToday(
            item,
            checklistItemDone,
            checklistItemCompletedAt,
            todayKey,
          ),
      )
      .map((item) => ({
        ...item,
        context: `${block.category} · ${block.subtitle ?? block.title}`,
        source: "checklist" as const,
        done: checklistItemDone(item.id),
      }));
  });

  const globalFastTasks = tasks
    .filter((task) => task.quick && taskIsVisibleToday(task, todayKey))
    .map((task) => ({
      id: task.id,
      title: task.title,
      priority: true,
      context: formatFatherId(task.fatherId, fronts, projects),
      source: "task" as const,
      done: Boolean(task.dueDate),
    }));

  return orderItemsByDoneLast(
    [...globalFastTasks, ...reliefFastTasks, ...checklistFastTasks],
    (task) => Boolean(task.done),
  );
}

function buildPersonalTaskItems(
  tasks: Task[],
  fronts: ManagedFront[],
  projects: Project[],
  todayKey: string,
): ActivityChecklistItem[] {
  return tasks
    .filter((task) => {
      const fatherId = task.fatherId ?? "";
      return fatherId.startsWith("pessoal.") && taskIsVisibleToday(task, todayKey);
    })
    .map((task) => ({
      id: `task:${task.id}`,
      taskId: task.id,
      title: task.title,
      priority: task.quick,
      context: formatFatherId(task.fatherId, fronts, projects),
      source: "task" as const,
      done: Boolean(task.dueDate),
    }));
}

function formatFatherId(fatherId: string, fronts: ManagedFront[], projects: Project[]) {
  const [areaId, frontId, projectId] = fatherId.split(".");
  const area = formatFatherSegment(areaId);
  const front = frontId ? fronts.find((item) => item.id === frontId) : undefined;
  const project = projectId ? projects.find((item) => item.id === projectId) : undefined;

  return [area, front?.title ?? formatFatherSegment(frontId), project?.title ?? formatFatherSegment(projectId)]
    .filter(Boolean)
    .join(" · ");
}

function formatFatherSegment(segment?: string) {
  if (!segment) return "";

  return segment
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeLabel(value?: string) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function taskIsVisibleToday(task: Task, todayKey: string) {
  const visibleByStart = !task.visibleFrom || task.visibleFrom <= todayKey;
  const visibleByCompletion = !task.dueDate || task.dueDate === todayKey;
  return visibleByStart && visibleByCompletion;
}

function checklistFastTaskIsVisibleToday(
  item: ActivityChecklistItem,
  checklistItemDone: (id: string) => boolean,
  checklistItemCompletedAt: (id: string) => string | undefined,
  todayKey: string,
) {
  if (!checklistItemDone(item.id)) return true;
  const completedAt = checklistItemCompletedAt(item.id);
  return completedAt ? toDateKey(new Date(completedAt)) === todayKey : true;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getSuggestedTravelDestinations(
  places: FixedPlace[],
  position: { latitude: number; longitude: number } | null,
  dayBlocks: ScheduleBlock[],
  todayKey: string,
  dayOfWeek: number,
  nowMinutes: number,
) {
  const home = places.find((place) => place.kind === "home");
  const work = places.find((place) => place.kind === "work");
  const partnerHome = places.find((place) => place.kind === "partner_home");
  const shuttleStop = places.find((place) => place.kind === "shuttle_stop");
  const destinations: TravelDestination[] = [];
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const atHome = isAtPlace(position, home);
  const atPartnerHome = isAtPlace(position, partnerHome);
  const inBrasilia = isInBrasilia(position, partnerHome);

  if (atPartnerHome) return [];

  if (inBrasilia && partnerHome) {
    return [{ place: partnerHome, iconKind: "partner_home", reason: "brasilia" }];
  }

  if (nowMinutes >= toMinutes("05:00")) {
    for (const block of dayBlocks) {
      const agendaPlace = findPlaceForAgendaLocation(places, block.location);
      if (
        !agendaPlace ||
        block.dateKey !== todayKey ||
        nowMinutes > toMinutes(block.endTime) + 30
      ) {
        continue;
      }

      addUniqueDestination(destinations, {
        place: agendaPlace,
        iconKind: isAirportPlace(agendaPlace) ? "airport" : "calendar",
        reason: "agenda",
      });
    }
  }

  if (isWeekday && nowMinutes >= toMinutes("05:00") && nowMinutes < toMinutes("06:30") && shuttleStop) {
    addUniqueDestination(destinations, {
      place: shuttleStop,
      iconKind: "shuttle_stop",
      reason: "time_window",
    });
  }

  if (isWeekday && nowMinutes >= toMinutes("05:00") && nowMinutes < toMinutes("07:30") && work) {
    addUniqueDestination(destinations, {
      place: work,
      iconKind: "work",
      reason: "time_window",
    });
  }

  if (isWeekday && nowMinutes >= toMinutes("15:30") && nowMinutes < toMinutes("19:00") && !atHome) {
    if (shuttleStop) {
      addUniqueDestination(destinations, {
        place: shuttleStop,
        iconKind: "shuttle_stop",
        reason: "time_window",
      });
    }
    if (home) {
      addUniqueDestination(destinations, {
        place: home,
        iconKind: "home",
        reason: "time_window",
      });
    }
  }

  const inWorkWindow = isWeekday && nowMinutes >= toMinutes("07:30") && nowMinutes < toMinutes("15:30");
  if (!inWorkWindow && !atHome && !inBrasilia && home) {
    addUniqueDestination(destinations, {
      place: home,
      iconKind: "home",
      reason: "away_from_home",
    });
  }

  return destinations;
}

function getAgendaLocationsToGeocode(
  places: FixedPlace[],
  dayBlocks: ScheduleBlock[],
  todayKey: string,
  nowMinutes: number,
) {
  if (nowMinutes < toMinutes("05:00")) return [];

  return Array.from(
    new Set(
      dayBlocks
        .filter(
          (block) =>
            block.dateKey === todayKey &&
            block.location &&
            nowMinutes <= toMinutes(block.endTime) + 30 &&
            !findPlaceForAgendaLocation(places, block.location),
        )
        .map((block) => block.location?.trim())
        .filter((location): location is string => Boolean(location && location.length >= 4)),
    ),
  );
}

function addUniqueDestination(destinations: TravelDestination[], destination: TravelDestination) {
  if (destinations.some((current) => current.place.id === destination.place.id)) return;
  destinations.push(destination);
}

function buildTravelHints(
  position: { latitude: number; longitude: number } | null,
  destinations: TravelDestination[],
) {
  if (!position || destinations.length === 0) return [];

  return destinations
    .filter((destination) => !isAtPlace(position, destination.place))
    .map((destination) => {
      const distanceMeters = distanceInMeters(
        position.latitude,
        position.longitude,
        destination.place.latitude,
        destination.place.longitude,
      );

      return {
        key: `${destination.place.id}:${destination.iconKind}:${buildTravelPositionKey(position)}`,
        destination,
        distanceMeters,
        minutes: estimateTravelMinutes(distanceMeters),
      };
    });
}

function buildTravelPositionKey(position: { latitude: number; longitude: number }) {
  return `${position.latitude.toFixed(4)},${position.longitude.toFixed(4)}`;
}

function estimateTravelMinutes(distanceMeters: number) {
  return Math.max(3, Math.round(distanceMeters / 450 + 4));
}

function TravelPlaceIcon({ destination, className }: { destination: TravelDestination; className?: string }) {
  const Icon = getTravelPlaceIcon(destination);
  return <Icon className={className} />;
}

function getTravelPlaceIcon(destination: TravelDestination) {
  if (destination.iconKind === "airport") return Plane;
  if (destination.iconKind === "calendar") return CalendarCheck;

  switch (destination.iconKind) {
    case "home":
      return House;
    case "partner_home":
      return Heart;
    case "work":
      return BriefcaseBusiness;
    case "shuttle_stop":
      return BusFront;
    case "gym":
      return Dumbbell;
    default:
      return CalendarCheck;
  }
}

function isAirportPlace(place: FixedPlace) {
  return /aeroporto|airport/i.test(`${place.label} ${place.address ?? ""}`);
}

function isAtPlace(
  position: { latitude: number; longitude: number } | null,
  place: FixedPlace | undefined,
) {
  if (!position || !place) return false;
  return (
    distanceInMeters(position.latitude, position.longitude, place.latitude, place.longitude) <=
    radiusForPlace(place)
  );
}

function isInBrasilia(
  position: { latitude: number; longitude: number } | null,
  partnerHome: FixedPlace | undefined,
) {
  if (!position || !partnerHome) return false;
  return (
    distanceInMeters(
      position.latitude,
      position.longitude,
      partnerHome.latitude,
      partnerHome.longitude,
    ) <= BRASILIA_RADIUS_METERS
  );
}

function radiusForPlace(place: FixedPlace) {
  if (place.kind === "shuttle_stop") return 120;
  return FIXED_PLACE_RADIUS_METERS;
}

function findPlaceForAgendaLocation(places: FixedPlace[], location: string | undefined) {
  if (!location) return null;
  const normalizedLocation = normalizeLabel(location);

  return (
    places.find((place) => {
      if (place.id === `agenda:${normalizedLocation}`) return true;
      const label = normalizeLabel(place.label);
      const address = normalizeLabel(place.address ?? "");
      return (
        normalizedLocation.includes(label) ||
        (address.length > 8 && normalizedLocation.includes(address)) ||
        (address.length > 8 && address.includes(normalizedLocation))
      );
    }) ?? null
  );
}

function distanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadius = 6_371_000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getCurrentWeekStartKey(date: Date) {
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - date.getDay());
  return toDateKey(sunday);
}

function orderItemsByDoneLast<T>(items: T[], isDone: (item: T) => boolean) {
  return [...items].sort((a, b) => Number(isDone(a)) - Number(isDone(b)));
}

function buildVisibleDays(baseDate: Date) {
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(baseDate);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);

    return {
      dateKey: formatDateKey(date),
      dayOfWeek: date.getDay(),
      label: WEEKDAYS_SHORT_LABELS[date.getDay()],
    };
  });
}

const WEEKDAYS_SHORT_LABELS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildActiveFreeTimeBlock(
  dayBlocks: ScheduleBlock[],
  dayOfWeek: number,
  dateKey: string,
  nowMinutes: number,
  currentBlock: ScheduleBlock | null,
): ScheduleBlock | null {
  if (currentBlock) return null;

  const nextBlock = dayBlocks.find((block) => toMinutes(block.startTime) > nowMinutes) ?? null;
  const previousBlock = [...dayBlocks]
    .reverse()
    .find((block) => toMinutes(block.endTime) <= nowMinutes);
  const boundary = nextBlock ? toMinutes(nextBlock.startTime) : BEDTIME_MINUTES;
  const start = previousBlock ? toMinutes(previousBlock.endTime) : nowMinutes;
  const end = Math.max(nowMinutes + 1, boundary);

  if (end <= start) return null;

  const startTime = formatMinutes(start);
  const endTime = formatMinutes(end);

  return {
    id: `${FREE_TIME_ID_PREFIX}-ativo-${dayOfWeek}-${previousBlock?.id ?? "inicio"}-${nextBlock?.id ?? "sono"}`,
    dateKey,
    dayOfWeek,
    startTime,
    endTime,
    category: "Tempo livre",
    title: "Aproveite seu tempo",
  };
}

function buildFinalFreeTimeBlock(
  dayBlocks: ScheduleBlock[],
  dayOfWeek: number,
  dateKey: string,
  nowMinutes: number,
): ScheduleBlock | null {
  if (nowMinutes >= BEDTIME_MINUTES) return null;

  const firstPostBedtimeIndex = dayBlocks.findIndex(
    (block) => toMinutes(block.startTime) >= BEDTIME_MINUTES,
  );
  const blocksBeforeBedtime =
    firstPostBedtimeIndex >= 0 ? dayBlocks.slice(0, firstPostBedtimeIndex) : dayBlocks;
  const lastBlockBeforeBedtime = blocksBeforeBedtime.at(-1) ?? null;
  const freeStart = Math.max(nowMinutes, lastBlockBeforeBedtime ? toMinutes(lastBlockBeforeBedtime.endTime) : nowMinutes);

  if (freeStart >= BEDTIME_MINUTES) return null;

  return {
    id: `${FREE_TIME_ID_PREFIX}-final-${dayOfWeek}-${lastBlockBeforeBedtime?.id ?? "inicio"}-21h30`,
    dateKey,
    dayOfWeek,
    startTime: formatMinutes(freeStart),
    endTime: "21:30",
    category: "Tempo livre",
    title: "Aproveite seu tempo",
  };
}

function buildCarouselBlocks(
  dayBlocks: ScheduleBlock[],
  activeFreeTimeBlock: ScheduleBlock | null,
  finalFreeTimeBlock: ScheduleBlock | null,
) {
  const blocks = [...dayBlocks];

  if (activeFreeTimeBlock) {
    const activeIndex = blocks.findIndex(
      (block) => toMinutes(block.startTime) >= toMinutes(activeFreeTimeBlock.endTime),
    );
    blocks.splice(activeIndex >= 0 ? activeIndex : blocks.length, 0, activeFreeTimeBlock);
  }

  if (finalFreeTimeBlock && finalFreeTimeBlock.endTime !== activeFreeTimeBlock?.endTime) {
    const finalIndex = blocks.findIndex((block) => toMinutes(block.startTime) >= BEDTIME_MINUTES);
    blocks.splice(finalIndex >= 0 ? finalIndex : blocks.length, 0, finalFreeTimeBlock);
  }

  return blocks;
}

function isFreeTimeBlock(block: ScheduleBlock | null) {
  return Boolean(block?.id.startsWith(FREE_TIME_ID_PREFIX));
}

function mergeReliefNotesIntoFreeTimeBlocks(
  carouselBlocks: ScheduleBlock[],
  extraItemsByActivity: Record<string, ActivityChecklistItem[]>,
  reliefNoteTaskItems: ActivityChecklistItem[],
) {
  const reliefNotes = [
    ...reliefNoteTaskItems,
    ...(extraItemsByActivity[RELIEF_NOTES_ACTIVITY_ID] ?? []),
  ];
  if (reliefNotes.length === 0) return extraItemsByActivity;

  return carouselBlocks.reduce(
    (itemsByActivity, block) => {
      if (!isFreeTimeBlock(block)) return itemsByActivity;

      itemsByActivity[block.id] = [
        ...reliefNotes,
        ...(itemsByActivity[block.id] ?? []),
      ];
      return itemsByActivity;
    },
    { ...extraItemsByActivity },
  );
}

function buildActivityIndicators(
  carouselBlocks: ScheduleBlock[],
  currentBlock: ScheduleBlock | null,
  focusedBlock: ScheduleBlock | null,
  activeFreeTimeBlock: ScheduleBlock | null,
) {
  return carouselBlocks.map((block) => ({
    id: block.id,
    kind: isFreeTimeBlock(block) ? ("free" as const) : ("activity" as const),
    selected: focusedBlock?.id === block.id,
    inProgress:
      currentBlock?.id === block.id || (!currentBlock && activeFreeTimeBlock?.id === block.id),
  }));
}
