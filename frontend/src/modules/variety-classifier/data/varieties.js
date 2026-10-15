// Each variety's accent color is drawn from its real husk color, so the
// result UI reads as botanically grounded rather than an arbitrary palette.
export const VARIETIES = {
  Dwarf: {
    color: "#4C7A3D",
    soft: "#EAF2E6",
    tagline: "Compact palm, early bearing",
    blurb:
      "Short-statured palms that fruit within 3–4 years. Husks are typically green, yellow, or orange, and the palms are easy to harvest by hand.",
  },
  "King Coconut": {
    color: "#E07A2C",
    soft: "#FBEADB",
    tagline: "Thambili — prized for its water",
    blurb:
      "Known locally as Thambili, recognizable by its bright orange husk. Grown mainly for its sweet, mineral-rich drinking water.",
  },
  Tall: {
    color: "#2F5A3D",
    soft: "#E4EEE4",
    tagline: "Tall palm, long commercial life",
    blurb:
      "Tall-growing palms that can live over 80 years and reach 20+ metres. The dominant variety for copra and coconut oil production.",
  },
};

export const getVariety = (name) =>
  VARIETIES[name] ?? {
    color: "#5C6B57",
    soft: "#EFF2E9",
    tagline: "",
    blurb: "",
  };
