/** Sources behind the evidence page: what each one is used for. */
export type Reference = {
  text: string;
  href: string;
  link: string;
  use: string;
};

const doi = (id: string) => ({
  href: `https://doi.org/${id}`,
  link: `doi:${id}`,
});

export const REFERENCES: Reference[] = [
  {
    text: "Ilyés-Vincze C, Vincze F, Leelossy A, Mészáros R (2025). Hive scale dataset near Debrecen, Hungary between 2020-2025. Mendeley Data, V1. CC BY 4.0.",
    ...doi("10.17632/3v3hhkddmz.1"),
    use: "The reference hive weights, used unchanged and downloaded at run time.",
  },
  {
    text: "Kim S, Kim TK, Yoon S, et al. (2021). J. Korean Soc. For. Sci. 110(3):322-340.",
    ...doi("10.14578/jkfs.2021.110.3.322"),
    use: "Black-locust parameters; validation error (RMSE) 6.1 days.",
  },
  {
    text: "Cesaraccio C, Spano D, Snyder RL, Duce P (2004). Chilling and forcing model to predict bud-burst of crop and forest species. Agric. For. Meteorol. 126:1-13.",
    ...doi("10.1016/j.agrformet.2004.03.002"),
    use: "The chill-days model.",
  },
  {
    text: "Chmielewski F-M, Blümel K, Henniges Y, Blanke M, Weber RWS, Zoth M (2011). Phenological models for the beginning of apple blossom in Germany. Meteorol. Z. 20:487-496.",
    ...doi("10.1127/0941-2948/2011/0258"),
    use: "Apple model.",
  },
  {
    text: "Matzneller P, Blümel K, Chmielewski F-M (2014). Models for the beginning of sour cherry blossom. Int. J. Biometeorol. 58:703-715.",
    ...doi("10.1007/s00484-013-0651-1"),
    use: "Sour cherry model.",
  },
  {
    text: "Esaias WE, Nickeson JE, Tan B, Ma PL, Nightingale JM, Wolfe RE (2011). Tracking climate effects on plant-pollinator interaction phenology with satellites and honey bee hives. Apimondia 2011, NASA NTRS 20110022423 (conference abstract).",
    href: "https://ntrs.nasa.gov/citations/20110022423",
    link: "ntrs.nasa.gov/citations/20110022423",
    use: "Daily hive weight records the timing of nectar flows, and that timing follows satellite green-up.",
  },
  {
    text: "Meikle WG, Holst N, Colin T, Weiss M, Carroll MJ, McFrederick QS, Barron AB (2018). PLOS ONE 13(5):e0197589.",
    ...doi("10.1371/journal.pone.0197589"),
    use: "Night as the resting period of the colony; also that hives lose weight at night as nectar dries.",
  },
  {
    text: "Meikle WG, Holst N (2015). Application of continuous monitoring of honeybee colonies. Apidologie 46:10-22.",
    ...doi("10.1007/s13592-014-0298-x"),
    use: "Review of continuous hive weighing.",
  },
  {
    text: "WWRP/WGNE Joint Working Group on Forecast Verification Research. Forecast verification: methods and FAQ.",
    href: "https://jwgfvr.github.io/forecastverification",
    link: "jwgfvr.github.io/forecastverification",
    use: "Judging a forecast against a reference such as climatology; warns that skill is unstable on small samples.",
  },
  {
    text: "Murphy AH (1988). Skill scores based on the mean square error and their relationships to the correlation coefficient. Mon. Wea. Rev. 116:2417-2424.",
    href: "https://doi.org/10.1175/1520-0493(1988)116%3C2417:SSBOTM%3E2.0.CO;2",
    link: "doi:10.1175/1520-0493(1988)116<2417:SSBOTM>2.0.CO;2",
    use: "Skill relative to a baseline.",
  },
  {
    text: "Roberts DR, Bahn V, Ciuti S, et al. (2017). Cross-validation strategies for data with temporal, spatial, hierarchical, or phylogenetic structure. Ecography 40:913-929.",
    ...doi("10.1111/ecog.02881"),
    use: "Holding out whole blocks, here whole years, instead of random records.",
  },
  {
    text: "Nosek BA, Ebersole CR, DeHaven AC, Mellor DT (2018). The preregistration revolution. PNAS 115:2600-2606.",
    ...doi("10.1073/pnas.1708274114"),
    use: "Why limits are fixed before the result is seen.",
  },
  {
    text: "Barve VV, Brenskelle L, Li D, et al. (2020). Appl. Plant Sci. 8(1):e11315.",
    ...doi("10.1002/aps3.11315"),
    use: "iNaturalist photos as flowering records, and their limits.",
  },
  {
    text: "Di Cecco GJ, Barve V, Belitz MW, Stucky BJ, Guralnick RP, Hurlbert AH (2021). BioScience 71(11).",
    ...doi("10.1093/biosci/biab093"),
    use: "Observer effort in iNaturalist: weekends, built-up areas, organised events in late April.",
  },
  {
    text: "Chabert S, Sénéchal C, Fougeroux A, et al. (2020). OCL 27:51.",
    ...doi("10.1051/ocl/2020040"),
    use: "Sunflower nectar in the field: air humidity and temperature mattered more than soil water.",
  },
  {
    text: "Wilkinson MD, Dumontier M, Aalbersberg IJ, et al. (2016). The FAIR Guiding Principles for scientific data management and stewardship. Sci. Data 3:160018.",
    ...doi("10.1038/sdata.2016.18"),
    use: "Open, findable data and code.",
  },
  {
    text: "NASA POWER daily point data (MERRA-2).",
    href: "https://power.larc.nasa.gov/",
    link: "power.larc.nasa.gov",
    use: "Temperature and wind for the model and for S3 and S6.",
  },
  {
    text: "iNaturalist observation histogram API. Aggregate counts only.",
    href: "https://api.inaturalist.org/v1/docs/",
    link: "api.inaturalist.org/v1/docs",
    use: "Weekly counts of black-locust records.",
  },
  {
    text: "PEP725 Pan European Phenology database.",
    href: "https://www.pep725.eu",
    link: "pep725.eu",
    use: "Orchard flowering dates, when a user supplies an export.",
  },
];
