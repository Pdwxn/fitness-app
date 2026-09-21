"use client";

import type { ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

const idFor = (index: number) => `exercise-${index}`;

type SortableExercisesProps = {
  count: number;
  onReorder: (from: number, to: number) => void;
  children: ReactNode;
};

/**
 * Drag-and-drop reordering for a day's exercises. Drag from the grip handle
 * only (so scrolling and typing in the card keep working on touch screens);
 * the up/down buttons stay as the keyboard- and screen-reader-friendly route.
 * Ids are positions: the list is renumbered after every move, so they are
 * always exactly `0..count-1`.
 */
export function SortableExercises({ count, onReorder, children }: SortableExercisesProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = Array.from({ length: count }, (_, index) => idFor(index));

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from !== -1 && to !== -1) onReorder(from, to);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

type SortableCardProps = {
  index: number;
  handleLabel: string;
  className?: string;
  children: (handle: ReactNode) => ReactNode;
};

export function SortableCard({ index, handleLabel, className, children }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: idFor(index),
  });

  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      aria-label={handleLabel}
      {...attributes}
      {...listeners}
      className="grid size-11 shrink-0 cursor-grab touch-none place-items-center rounded-full text-white/60 active:cursor-grabbing"
    >
      <GripVertical aria-hidden="true" size={22} strokeWidth={1.6} />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${className ?? ""} ${isDragging ? "relative z-10 opacity-80 shadow-2xl" : ""}`}
    >
      {children(handle)}
    </div>
  );
}
