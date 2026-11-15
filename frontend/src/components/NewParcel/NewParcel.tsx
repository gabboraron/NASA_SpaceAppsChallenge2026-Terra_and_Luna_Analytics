import { useState } from "react";
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

/** Name the polygon just drawn and say what blooms there, then keep it as an own parcel. */
export function NewParcel({ name, first, tooLarge, onSave, onCancel }: Props) {
  const [label, setLabel] = useState(name);
  const [crop, setCrop] = useState(OWN_CROPS[0]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");
  const modelled = MODELLED_CROPS.has(crop);

  if (tooLarge)
    return (
      <section className={styles.form} aria-labelledby="new-parcel-h">
        <strong id="new-parcel-h">This shape is larger than a field</strong>
        <p role="alert" className={styles.error}>
          A parcel can be at most about 8 km across. Zoom in to your apiary and
          draw around a single field.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={onCancel}>
            Discard and draw again
          </button>
        </div>
      </section>
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
    <section className={styles.form} aria-labelledby="new-parcel-h">
      <strong id="new-parcel-h">
        {first ? "Your home apiary parcel" : "Your new parcel"}
      </strong>
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
          Bloom is modelled at this spot from NASA POWER temperatures, for each
          season.
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
      <small>Kept in your account in this browser only.</small>
    </section>
  );
}
