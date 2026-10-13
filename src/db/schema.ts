import Dexie, { type Table } from 'dexie';

export type ExerciseType = 'weight' | 'time';

export interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
  notes?: string;
  createdAt: number;
  archived?: boolean;
}

export interface WeightSet {
  weight: number | null;
  reps: number | null;
  done: boolean;
}

export interface TimeSet {
  durationSec: number | null;
  distanceKm: number | null;
  done: boolean;
}

export type AnySet = WeightSet | TimeSet;

export interface Entry {
  id: string;
  exerciseId: string;
  notes?: string;
  sets: AnySet[];
}

export interface Workout {
  id: string;
  name: string;
  startedAt: number;
  /** 0 while the workout is in progress (IndexedDB cannot index null). */
  finishedAt: number;
  templateId?: string;
  notes?: string;
  entries: Entry[];
}

export interface TemplateEntry {
  id: string;
  exerciseId: string;
  notes?: string;
  sets: AnySet[];
}

export interface Template {
  id: string;
  name: string;
  notes?: string;
  entries: TemplateEntry[];
  createdAt: number;
  updatedAt: number;
}

class GymDB extends Dexie {
  exercises!: Table<Exercise, string>;
  workouts!: Table<Workout, string>;
  templates!: Table<Template, string>;

  constructor() {
    super('gym-tracker');
    this.version(1).stores({
      exercises: 'id, name, createdAt',
      workouts: 'id, startedAt, finishedAt',
      templates: 'id, name, updatedAt',
    });
  }
}

export const db = new GymDB();

export const uid = () =>
  crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);

export const isWeightSet = (s: AnySet): s is WeightSet => 'reps' in s;
