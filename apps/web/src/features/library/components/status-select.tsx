import type { MediaType, WatchStatus } from "@otium/types";
import { Select } from "@otium/ui";
import { useSetWatchStatus } from "../api/use-item-detail";
import { statusLabel, statusOptions } from "../status";

interface StatusSelectProps {
  itemId: string;
  type: MediaType;
  value: WatchStatus;
}

/** Sélecteur de statut de suivi (ex. marquer un film « vu » ou « à voir »). */
export function StatusSelect({ itemId, type, value }: StatusSelectProps) {
  const setStatus = useSetWatchStatus(itemId);
  const options = statusOptions(type);
  // Garantit que le statut courant reste visible même s'il n'est pas proposé au choix.
  const values = options.includes(value) ? options : [value, ...options];

  return (
    <Select
      aria-label="Statut de suivi"
      className="max-w-[12rem]"
      value={value}
      disabled={setStatus.isPending}
      onChange={(event) => setStatus.mutate(event.target.value as WatchStatus)}
    >
      {values.map((status) => (
        <option key={status} value={status}>
          {statusLabel(status, type)}
        </option>
      ))}
    </Select>
  );
}
