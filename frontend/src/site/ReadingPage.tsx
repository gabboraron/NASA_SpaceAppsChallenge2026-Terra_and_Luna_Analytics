import type { ReactNode } from "react";
import { CuteBee, type BeePose } from "./CuteBee";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import page from "./page.module.css";

/** Shell of a reading page: header, an optional intro block, content, footer. */
export function ReadingPage({
  kicker,
  title,
  lead,
  bee,
  children,
}: {
  /** Pose of the cartoon bee shown beside the intro. */
  bee?: BeePose;
  kicker?: ReactNode;
  title?: ReactNode;
  lead?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={page.page}>
      <SiteHeader />
      <main>
        {title && (
          <div className={`${page.wrap} ${page.intro}`}>
            <div className={page.introText}>
              {kicker && <span className={page.kicker}>{kicker}</span>}
              <h1 className={page.title}>{title}</h1>
              {lead && <p className={page.lead}>{lead}</p>}
            </div>
            {bee && (
              <span className={page.mascot}>
                <CuteBee pose={bee} />
              </span>
            )}
          </div>
        )}
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
