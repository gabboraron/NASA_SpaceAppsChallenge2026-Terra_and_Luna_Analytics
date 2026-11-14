import { REPO, TEAM } from "./meta";
import { Link, ROUTES } from "./router";
import styles from "./SiteFooter.module.css";

/** Colophon footer shared by the reading pages. */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div>
        <span className="mono">COLOPHON</span>
        <p>
          Built by Terra &amp; Luna Analytics for the NASA Space Apps Challenge
          2026. Code under MPL 2.0 on <a href={REPO}>GitHub</a>.
        </p>
      </div>
      <div>
        <span className="mono">DATA</span>
        <p>
          NASA HLS, SMAP L4 and POWER; EEA Natura 2000; OpenStreetMap.{" "}
          <Link to={ROUTES.data}>Sources and licences</Link>
        </p>
      </div>
      <div>
        <span className="mono">TEAM</span>
        <p>{TEAM.join(", ")}</p>
      </div>
      <div>
        <span className="mono">NOTE</span>
        <p>
          Not affiliated with or endorsed by NASA. Beekeepers are synthetic;
          parcels are illustrative.
        </p>
      </div>
    </footer>
  );
}
