// remediation worker: consumes the queues and runs the engine.
// consumers are wired in phase 2. this is the scaffolded entry point.
import { ENGINE_VERSION } from "@fhirfix/engine";

console.info(`[worker] fhirfix worker scaffolded (engine ${ENGINE_VERSION}). consumers land in phase 2.`);
