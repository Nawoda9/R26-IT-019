
const MANAGEMENT_RULES = {
  flaccidity: {
    early: {
      title: "Early flaccidity detected",
      priority: "Routine follow-up",
      actions: [
        "Record the affected palm and assessment date.",
        "Arrange an agricultural inspection to assess the suspected WCLWD symptoms.",
        "Monitor and document any changes in leaflet flaccidity or bending."
      ],
      note: "Do not prescribe fertilizer or magnesium based on the image result alone."
    },
    moderate: {
      title: "Moderate flaccidity detected",
      priority: "Agricultural inspection recommended",
      actions: [
        "Arrange a field assessment to review the suspected disease and palm condition.",
        "Document symptoms and review previous assessment results.",
        "Ask the agricultural officer to assess whether nutrient deficiencies or other conditions also need investigation."
      ],
      note: "NPK fertilizer or magnesium sulfate should not be prescribed automatically from this visual classification."
    },
    severe: {
      title: "Severe flaccidity detected",
      priority: "Priority assessment",
      actions: [
        "Flag the palm for prompt inspection by the relevant coconut agricultural authority.",
        "Provide the assessment result and symptom images to the officer.",
        "Follow the official disease-management decision for the affected area."
      ],
      note: "The AI result alone cannot decide whether the palm should be removed."
    }
  },

  yellowing: {
    early: {
      title: "Early yellowing detected",
      priority: "Monitor and assess",
      actions: [
        "Record the palm location, date and visible yellowing pattern.",
        "Monitor changes in symptoms and, where available, record yield changes.",
        "Arrange an agricultural assessment if symptoms persist or increase."
      ],
      note: "Yellowing can have more than one cause. Do not assume it is a magnesium deficiency."
    },
    moderate: {
      title: "Moderate yellowing detected",
      priority: "Agricultural inspection recommended",
      actions: [
        "Arrange a field inspection to assess suspected WCLWD and other possible causes.",
        "Record symptom progression and provide the image assessment to the officer.",
        "Follow expert advice on further diagnosis and management."
      ],
      note: "Do not automatically prescribe fertilizer or insecticide based only on yellowing."
    },
    severe: {
      title: "Severe yellowing detected",
      priority: "Priority assessment",
      actions: [
        "Flag the case for prompt assessment by the relevant coconut agricultural authority.",
        "Provide the image, severity result and palm history if available.",
        "Follow the applicable official WCLWD management guidance."
      ],
      note: "Any disease-control or tree-removal decision requires appropriate assessment."
    }
  },

  drying: {
    early: {
      title: "Early leaflet drying detected",
      priority: "Inspect the palm",
      actions: [
        "Arrange an agricultural inspection to assess leaflet drying and possible associated disease.",
        "Record the affected parts of the palm and monitor symptom progression.",
        "Follow the officer's advice on further diagnosis and management."
      ],
      note: "Do not automatically order felling or burning based on an AI result."
    },
    moderate: {
      title: "Moderate leaflet drying detected",
      priority: "Agricultural inspection recommended",
      actions: [
        "Arrange a field inspection to assess the extent of leaflet drying.",
        "Check for possible associated conditions, including leaf rot.",
        "Record the assessment and follow the authorised management advice."
      ],
      note: "Tree removal should not be decided by this visual model alone."
    },
    severe: {
      title: "Severe leaflet drying detected",
      priority: "Priority assessment",
      actions: [
        "Flag the palm for prompt inspection by the relevant coconut agricultural authority.",
        "Provide the assessment image and severity result for review.",
        "If WCLWD is confirmed, follow the official disease-control decision applicable to the area."
      ],
      note: "The model flags a case for review; it does not independently authorise tree removal."
    }
  }
};

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .trim();
}

export function getManagementPlan(symptom, severity) {
  const s = normalizeText(symptom);
  const v = normalizeText(severity);

  let symptomKey = null;

  if (s.includes("flaccid") || s.includes("flaccidity")) {
    symptomKey = "flaccidity";
  } else if (s.includes("yellow")) {
    symptomKey = "yellowing";
  } else if (
    s.includes("drying") ||
    s.includes("dry leaflet") ||
    s.includes("leaflet dry")
  ) {
    symptomKey = "drying";
  }

  let severityKey = null;

  if (
    v.includes("early") ||
    v.includes("mild") ||
    v.includes("low")
  ) {
    severityKey = "early";
  } else if (
    v.includes("moderate") ||
    v.includes("medium")
  ) {
    severityKey = "moderate";
  } else if (
    v.includes("severe") ||
    v.includes("high") ||
    v.includes("advanced")
  ) {
    severityKey = "severe";
  }

  if (!symptomKey || !severityKey) {
    return null;
  }

  return MANAGEMENT_RULES[symptomKey][severityKey] ?? null;
}
