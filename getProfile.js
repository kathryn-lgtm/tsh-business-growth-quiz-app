export function getProfile({ stage, path }) {
  const normalizedStage = String(stage || "").trim().toLowerCase();
  const normalizedPath = String(path || "").trim().toLowerCase();

  if (normalizedStage === "idea") {
    return "get-clear";
  }

  if (normalizedStage === "early" && normalizedPath === "clarity") {
    return "get-clear";
  }

  if (
    normalizedStage === "early" &&
    (normalizedPath === "marketing" || normalizedPath === "clarity")
  ) {
    return "foundations";
  }

  if (
    (normalizedStage === "early" || normalizedStage === "growth") &&
    normalizedPath === "marketing"
  ) {
    return "get-seen";
  }

  if (normalizedStage === "growth" && normalizedPath === "sales") {
    return "sales-fix";
  }

  if (
    (normalizedStage === "growth" || normalizedStage === "scale") &&
    normalizedPath === "systems"
  ) {
    return "scale-systems";
  }

  if (
    normalizedStage === "scale" &&
    (normalizedPath === "marketing" || normalizedPath === "sales")
  ) {
    return "optimise-expand";
  }

  return "mixed-signals";
}