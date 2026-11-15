import type { ReactNode } from "react";
import { REPO } from "../../site/meta";
import { Link, ROUTES } from "../../site/router";

export const GLOSSARY = [
  {
    term: "NDYI",
    def: "Normalized difference yellowness index, from HLS. It rises when yellow petals cover a field.",
  },
  {
    term: "NDVI",
    def: "Normalized difference vegetation index, from HLS. How green and leafy a field is.",
  },
  {
    term: "GDD · growing degree days",
    def: "Heat accumulated above a base temperature since the season started, from NASA POWER. Trees flower after a set amount.",
  },
  {
    term: "Root-zone percentile",
    def: "How dry the soil is compared with the same week in 2015 to 2024, for one SMAP cell. The 5th percentile means drier than in 95 % of those weeks.",
  },
  {
    term: "SMAP cell",
    def: "The ~9 km square that one SMAP soil moisture value covers. Every parcel inside shares it.",
  },
  {
    term: "Interpolated week",
    def: "A week between two clear satellite passes at most 21 days apart, filled in by interpolation. Drawn dashed and labelled as an estimate.",
  },
  {
    term: "Foraging radius",
    def: "Rings at 1, 2 and 3 km around your home parcel and the selected parcel: a visual guide to how far bees from there may fly.",
  },
  {
    term: "Home apiary",
    def: "The one of your own parcels where your hives stand. Every move, distance and match starts from it; your first parcel is the home apiary until you choose another.",
  },
  {
    term: "Honey filter",
    def: "Keeps on the map and in your matches only the parcels whose bloom gives the honey you chose: acacia, sunflower, fruit blossom or meadow.",
  },
  {
    term: "Placement request",
    def: "Asking to keep hives on a listed parcel for a period. In the demo it is stored in your browser only and no grower is contacted.",
  },
  {
    term: "Natura 2000",
    def: "The European network of protected sites, used here as the protected-area layer.",
  },
  {
    term: "Detour factor",
    def: "Straight-line distance × 1.3, a stand-in for road distance. Labelled Estimated and editable.",
  },
  {
    term: "Confidence",
    def: "How well the bloom timing of a match is evidenced: low for a declaration only, medium for a model, high once observed.",
  },
  {
    term: "Contribution after incremental costs",
    def: "Income from a move minus the costs the move itself adds (fuel, labour, commission, feed). Fixed costs of the operation are not included.",
  },
  {
    term: "Benefit relative to the alternative",
    def: "What a move adds compared with leaving the colonies where they are.",
  },
  {
    term: "Synthetic · illustrative",
    def: "Synthetic growers are made-up profiles; illustrative parcels are real field shapes with made-up listings.",
  },
];

export const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: "Who is this for?",
    a: "Migratory beekeepers who move colonies between crops, and growers of insect-pollinated crops who want hives at the right week. Advisers and cooperatives can use the map to plan a region.",
  },
  {
    q: "Is this a real marketplace?",
    a: "Not yet. It is a working demo: the NASA data is real (each value shows the date it describes), the sign-in is a mock, the growers are synthetic, the listed parcels are illustrative, and a placement request is stored in your browser only: no grower is contacted.",
  },
  {
    q: "Do I need an account?",
    a: "Not a real one. The explorer works as a signed-in beekeeper, and one click on Continue as demo beekeeper is enough. You can also register: the account, its parcels and placement requests live only in your browser, the password is not stored or checked, and your name and email never leave the browser. The server receives your apiary location, parcel shapes and profile numbers to compute matches and bloom, and stores none of them. A simulated field photo is kept in memory only and is gone when the server restarts.",
  },
  {
    q: "Where are my parcels saved?",
    a: "In your browser, with your demo account. They stay after a reload or a new version of the site, but not in another browser or on another device, and clearing the site data removes them. Nothing is stored on the server.",
  },
  {
    q: "Why can't I save the parcel I drew?",
    a: "It is larger than a field. A parcel can span at most 0.1° (about 8 to 11 km), which is easy to exceed when drawing zoomed out. Discard it, zoom in to your apiary and draw around a single field.",
  },
  {
    q: "What do the circles, hexagons and the hive on the map mean?",
    a: "Circles are parcels seen from far out: the fill is this week's bloom and the rim the crop (thick blue for your own). Numbered honey hexagons are the ranks of your placements, the same numbers as the cards. The dark box with two stripes is your home apiary, with 1, 2 and 3 km foraging rings.",
  },
  {
    q: "Does it work outside the pilot region?",
    a: "The NASA datasets are global, so the method carries over. Each new region needs parcels, protected-area boundaries and phenology parameters with sources. Your own parcels already work anywhere: their bloom is modelled from NASA POWER where they lie.",
  },
  {
    q: "Which crops does it know?",
    a: (
      <>
        Apple, sour cherry and black locust have a bloom model. Sunflower shows
        the satellite yellowness index as evidence but, like grassland and any
        other crop, takes its bloom weeks from the window the grower declares;
        without a declaration the bloom is Missing. See{" "}
        <Link to={`${ROUTES.method}#bloom`}>Bloom by crop</Link>.
      </>
    ),
  },
  {
    q: "Why does sunflower bloom say Reported, not Observed?",
    a: "The yellowness index is shown as evidence, but its bloom threshold is not calibrated yet, so the bloom week itself comes from the grower's declared window. A field photo turns it into Observed.",
  },
  {
    q: "Why does a value say Missing?",
    a: "Clouds, a failed request, no satellite pass that week, or no model for that crop. The badge gives the reason. Missing values are never filled in with a guess.",
  },
  {
    q: "Why is a match low confidence?",
    a: "Confidence follows the evidence for the bloom timing: low for a grower's declaration alone, medium for a model estimate, high once the bloom is observed.",
  },
  {
    q: "Why is only sunflower flagged for low nectar?",
    a: "Orchards are assumed not to be water-limited, and for black locust the drought rule did not agree with hive-scale records, so it is left out.",
  },
  {
    q: "Why 3 km around protected sites?",
    a: "Bees forage across several kilometres, so colonies placed near a site will also fly into it. The warning asks you to check local rules; only parcels inside a site are blocked.",
  },
  {
    q: "Can I trust the calculator?",
    a: "It shows the contribution after incremental costs from inputs you can see and change, in a low, base and high case. It is a planning aid, not a quote, and makes no yield promises.",
  },
  {
    q: "Why can the satellite part of a drawn field say Missing?",
    a: "The satellite rows use the latest usable HLS scene of the last 30 days. If cloud covered the field on every pass, or the read failed, they say so. The weather from NASA POWER still loads.",
  },
  {
    q: "Is it free and open?",
    a: (
      <>
        Yes. The code is under the Mozilla Public License 2.0 and every dataset
        is open; see <Link to={ROUTES.data}>Data &amp; sources</Link>.
      </>
    ),
  },
  {
    q: "How do I run it myself?",
    a: (
      <>
        <span className="mono">docker compose up --build</span>, then open
        localhost:8080. Instructions are in the{" "}
        <a href={REPO}>repository README</a>.
      </>
    ),
  },
];
