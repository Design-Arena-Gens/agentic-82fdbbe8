"use client";

import { useEffect, useState } from "react";

type Serializer<T> = (value: T) => string;
type Deserializer<T> = (raw: string) => T;

export function usePersistentState<T>(
  key: string,
  defaultValue: T,
  {
    serializer = JSON.stringify as Serializer<T>,
    deserializer = JSON.parse as Deserializer<T>,
  }: {
    serializer?: Serializer<T>;
    deserializer?: Deserializer<T>;
  } = {}
) {
  const [value, setValue] = useState<T>(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(key);
      if (stored != null) {
        const parsed = deserializer === (JSON.parse as Deserializer<T>)
          ? (JSON.parse(stored) as T)
          : deserializer(stored);
        setValue(parsed);
      }
    } catch (error) {
      console.error("Failed to read persistent state", error);
      window.localStorage.removeItem(key);
    } finally {
      setIsHydrated(true);
    }
  }, [key, deserializer]);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;
    try {
      const raw = serializer === (JSON.stringify as Serializer<T>)
        ? JSON.stringify(value)
        : serializer(value);
      window.localStorage.setItem(key, raw);
    } catch (error) {
      console.error("Failed to write persistent state", error);
    }
  }, [key, value, isHydrated, serializer]);

  return [value, setValue, isHydrated] as const;
}

