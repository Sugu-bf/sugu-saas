import { ApiError } from "./api-error";
import { apiFetch } from "./client";

// Files the backend builds (CSV exports, PDF slips), fetched through the BFF
// and handed to the browser.

/** Turn a failed binary response into the same `ApiError` a JSON call throws. */
async function failedDownload(response: Response): Promise<ApiError> {
  let message = `HTTP ${response.status}`;
  try {
    const body = (await response.json()) as { message?: string };
    if (body.message) message = body.message;
  } catch {
    // Not JSON: keep the status.
  }
  return new ApiError({ message, status: response.status });
}

export async function downloadBlob(path: string, init: RequestInit): Promise<Blob> {
  let response: Response;
  try {
    response = await apiFetch(path, init);
  } catch {
    throw new ApiError({ message: "Network error", status: 0, code: "NETWORK" });
  }
  if (!response.ok) throw await failedDownload(response);
  return response.blob();
}

/** Hand a blob to the browser as a file. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
