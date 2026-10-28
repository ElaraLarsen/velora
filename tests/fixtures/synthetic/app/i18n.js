// FABRICATED test fixture for Handwave. Not real application code.
const STRINGS = {
  uploadButton: {
    en: "Upload photo",
    hi: "फ़ोटो अपलोड करें",
    ta: "புகைப்படத்தைப் பதிவேற்றவும்",
  },
  clinicianMode: {
    en: "Clinician view (English)",
    hi: "चिकित्सक दृश्य (अंग्रेज़ी)",
    ta: "மருத்துவர் பார்வை (ஆங்கிலம்)",
  },
};

function t(key, lang) {
  return (STRINGS[key] && STRINGS[key][lang]) || STRINGS[key].en;
}

module.exports = { STRINGS, t };
