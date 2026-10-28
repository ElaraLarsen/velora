// FABRICATED test fixture for Handwave. Not real application code.
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

function compressPhoto(file) {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Photo too large");
  }
  return resizeTo(file, 1024);
}

async function submitPhoto(file, patientRef) {
  const photo = compressPhoto(file);
  const res = await fetch("/api/photos", { method: "POST", body: photo });
  showToast("Uploaded!");
  return res;
}

function logAttempt() {
  console.log("attempt");
}

function logAttemptAgain() {
  console.log("attempt");
}

module.exports = { compressPhoto, submitPhoto };
