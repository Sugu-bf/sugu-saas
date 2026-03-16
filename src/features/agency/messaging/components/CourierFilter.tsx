"use client";

import { useMemo } from "react";
import type { Conversation } from "@/lib/messaging/types";
import { Filter } from "lucide-react";

interface CourierFilterProps {
  conversations: Conversation[];
  value: string | undefined;
  onChange: (courierId: string | undefined) => void;
}

interface CourierOption {
  id: string;
  name: string;
}

/**
 * CourierFilter — dropdown to filter conversations by courier.
 * Extracts unique courier participants from loaded conversations.
 */
export function CourierFilter({
  conversations,
  value,
  onChange,
}: CourierFilterProps) {
  const couriers = useMemo(() => {
    const map = new Map<string, string>();
    for (const conv of conversations) {
      for (const p of conv.participants ?? []) {
        if (p.type === "courier" && !map.has(p.id)) {
          map.set(p.id, p.name);
        }
      }
    }
    const result: CourierOption[] = [];
    map.forEach((name, id) => result.push({ id, name }));
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [conversations]);

  if (couriers.length === 0) return null;

  return (
    <div className="relative">
      <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
      <select
        id="courier-filter"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="form-input w-full appearance-none pl-8 pr-8 text-sm"
        aria-label="Filtrer par coursier"
      >
        <option value="">Tous les coursiers</option>
        {couriers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
