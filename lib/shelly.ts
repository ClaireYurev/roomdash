export interface ShellyStatusResponse {
  id: number;
  source: string;
  output: boolean;
  apower: number;
  voltage: number;
  current: number;
  temperature: { tC: number };
}

function getTimeoutMs(): number {
  return parseInt(process.env.SHELLY_TIMEOUT_MS || "3000", 10);
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getShellyStatus(ip: string): Promise<{
  data: ShellyStatusResponse | null;
  durationMs: number;
  error?: string;
  timedOut?: boolean;
}> {
  const start = Date.now();
  const timeout = getTimeoutMs();
  try {
    const response = await fetchWithTimeout(
      `http://${ip}/rpc/Switch.GetStatus?id=0`,
      timeout
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as ShellyStatusResponse;
    return { data, durationMs: Date.now() - start };
  } catch (error) {
    const timedOut =
      error instanceof Error && error.name === "AbortError";
    return {
      data: null,
      durationMs: Date.now() - start,
      error: timedOut
        ? "Timeout"
        : error instanceof Error
        ? error.message
        : "Unknown error",
      timedOut,
    };
  }
}

export async function setShellyOutput(
  ip: string,
  on: boolean
): Promise<{ success: boolean; durationMs: number; error?: string }> {
  const start = Date.now();
  const timeout = getTimeoutMs();
  try {
    const response = await fetchWithTimeout(
      `http://${ip}/rpc/Switch.Set?id=0&on=${on}`,
      timeout
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { success: true, durationMs: Date.now() - start };
  } catch (error) {
    return {
      success: false,
      durationMs: Date.now() - start,
      error:
        error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function powerCycleShelly(ip: string): Promise<{
  success: boolean;
  durationMs: number;
  error?: string;
}> {
  const start = Date.now();
  const offResult = await setShellyOutput(ip, false);
  if (!offResult.success) {
    return {
      success: false,
      durationMs: Date.now() - start,
      error: offResult.error,
    };
  }
  await new Promise((resolve) => setTimeout(resolve, 5000));
  const onResult = await setShellyOutput(ip, true);
  return {
    success: onResult.success,
    durationMs: Date.now() - start,
    error: onResult.error,
  };
}
