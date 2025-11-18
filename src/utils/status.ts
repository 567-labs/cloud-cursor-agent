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

/**
 * Format a date as a relative time string (e.g., "2 hours ago", "just now")
 */
export function getRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = typeof date === "string" ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 10) {
    return "just now";
  } else if (diffSeconds < 60) {
    return `${diffSeconds} second${diffSeconds === 1 ? "" : "s"} ago`;
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`;
  } else if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
  } else {
    return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
  }
}

