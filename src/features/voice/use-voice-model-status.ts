"use client";

import { useEffect, useState } from "react";
import {
  getModelStatus,
  subscribeModelStatus,
  type VoiceModelStatus,
} from "./transcription-worker-client";

/**
 * Live status of the on-device speech model (download/init progress + ready),
 * driven by the shared transcription worker's background warm-up.
 */
export function useVoiceModelStatus(): VoiceModelStatus {
  const [status, setStatus] = useState<VoiceModelStatus>(getModelStatus);
  useEffect(() => subscribeModelStatus(setStatus), []);
  return status;
}
