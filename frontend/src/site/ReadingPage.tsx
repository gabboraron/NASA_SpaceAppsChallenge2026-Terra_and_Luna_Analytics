import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import page from "./page.module.css";

/** Shell of a reading page: header, an optional intro block, content, footer. */
export function ReadingPage({
  kicker,
  title,
  lead,
  children,
}: {
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
            {kicker && <span className={page.kicker}>{kicker}</span>}
            <h1 className={page.title}>{title}</h1>
            {lead && <p className={page.lead}>{lead}</p>}
          </div>
        )}
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
