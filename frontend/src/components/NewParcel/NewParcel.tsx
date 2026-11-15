import { useEffect, useRef, useState, type ReactNode } from "react";
import type { OwnParcel } from "../../account/session";
import { MODELLED_CROPS, OWN_CROPS, cropName } from "../../domain/season";
import styles from "./NewParcel.module.css";

type Props = {
  /** Suggested name, e.g. "Home apiary" for the first parcel. */
  name: string;
  /** True when this becomes the home apiary (the first own parcel). */
  first: boolean;
  /** The drawn shape is larger than a field: it cannot be saved. */
  tooLarge: boolean;
  onSave: (parcel: Pick<OwnParcel, "name" | "crop" | "declared_bloom">) => void;
  onCancel: () => void;
};

/** A modal dialog over the map: Esc or the backdrop discards, like Discard. */
function Dialog({
  onCancel,
  children,
}: {
  onCancel: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="new-parcel-h"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      {children}
    </dialog>
  );
}

/**
 * Asks to confirm the polygon just drawn: name it and say what blooms there,
 * then keep it as an own parcel. Nothing is saved until Save parcel.
 */
export function NewParcel({ name, first, tooLarge, onSave, onCancel }: Props) {
  const [label, setLabel] = useState(name);
  const [crop, setCrop] = useState(OWN_CROPS[0]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");
  const modelled = MODELLED_CROPS.has(crop);

  if (tooLarge)
    return (
      <Dialog onCancel={onCancel}>
        <section className={styles.form}>
          <strong id="new-parcel-h">This shape is larger than a field</strong>
          <p role="alert" className={styles.error}>
            A parcel can be at most about 8 km across. Zoom in to your apiary
            and draw around a single field.
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={onCancel}>
              Discard and draw again
            </button>
          </div>
        </section>
      </Dialog>
    );

  const save = () => {
    if (!label.trim()) return setError("Give the parcel a name.");
    if (!modelled && (start || end) && (!start || !end || end < start))
      return setError("Enter both bloom dates, first day before last.");
    onSave({
      name: label.trim(),
      crop,
      declared_bloom: !modelled && start && end ? { start, end } : null,
    });
  };

  return (
    <Dialog onCancel={onCancel}>
      <section className={styles.form}>
        <strong id="new-parcel-h">
          {first ? "Save your home apiary parcel?" : "Save this parcel?"}
        </strong>
        <small>
          {first
            ? "Your moves and matches will start from this parcel."
            : "It joins your parcels; your home apiary stays the same."}
        </small>
        <label htmlFor="new-parcel-name">
          Name
          <input
            id="new-parcel-name"
            value={label}
            maxLength={40}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        <label htmlFor="new-parcel-crop">
          What blooms here
          <select
            id="new-parcel-crop"
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
          >
            {OWN_CROPS.map((c) => (
              <option key={c} value={c}>
                {cropName(c)}
              </option>
            ))}
          </select>
        </label>
        {modelled ? (
          <small>
            Bloom is modelled at this spot from NASA POWER temperatures, for
            each season.
          </small>
        ) : (
          <>
            <div className={styles.dates}>
              <label htmlFor="new-parcel-from">
                Bloom from
                <input
                  id="new-parcel-from"
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </label>
              <label htmlFor="new-parcel-to">
                Bloom until
                <input
                  id="new-parcel-to"
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </label>
            </div>
            <small>
              No bloom model runs for {cropName(crop).toLowerCase()} on an own
              parcel: your dates are used and shown as Reported (optional).
            </small>
          </>
        )}
        {error && (
          <small role="alert" className={styles.error}>
            {error}
          </small>
        )}
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={save}>
            Save parcel
          </button>
          <button type="button" onClick={onCancel}>
            Discard
          </button>
        </div>
        <small>
          Kept in your account in this browser only. Remove it any time from the
          map or your account.
        </small>
      </section>
    </Dialog>
  );
}
