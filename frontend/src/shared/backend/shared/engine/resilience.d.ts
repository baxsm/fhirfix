export declare class SidecarError extends Error {
    readonly sidecar: string;
    readonly upstreamStatus?: number | undefined;
    readonly upstreamBody?: string | undefined;
    constructor(message: string, sidecar: string, upstreamStatus?: number | undefined, upstreamBody?: string | undefined);
}
export declare function describeSidecarError(err: SidecarError): string;
export declare class CircuitOpenError extends SidecarError {
    constructor(sidecar: string);
}
export interface ResilienceOptions {
    timeoutMs: number;
    retries: number;
    backoffBaseMs: number;
    circuitThreshold: number;
    circuitResetMs: number;
    now?: () => number;
    sleep?: (ms: number) => Promise<void>;
}
export declare class CircuitBreaker {
    private readonly name;
    private readonly opts;
    private consecutiveFailures;
    private openUntil;
    constructor(name: string, opts: ResilienceOptions);
    private now;
    get isOpen(): boolean;
    recordSuccess(): void;
    recordFailure(): void;
    assertClosed(): void;
}
export declare function resilientFetch(name: string, breaker: CircuitBreaker, url: string, init: RequestInit, optsIn?: Partial<ResilienceOptions>): Promise<Response>;
