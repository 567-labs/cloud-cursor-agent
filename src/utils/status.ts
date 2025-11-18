export type StatusDisplay = {
  symbol: string;
  label: string;
  color: string;
};

export function getStatusDisplay(status: string): StatusDisplay {
  switch (status) {
    case "CREATING":
      return { symbol: "●", label: "Creating", color: "yellow" };
    case "RUNNING":
      return { symbol: "▶", label: "Running", color: "green" };
    case "FINISHED":
      return { symbol: "✓", label: "Finished", color: "green" };
    case "FAILED":
      return { symbol: "✗", label: "Failed", color: "red" };
    case "CANCELLED":
      return { symbol: "○", label: "Cancelled", color: "gray" };
    default:
      return { symbol: "?", label: status, color: "gray" };
  }
}

