declare const error: (path: string, detail: string | string[] | unknown) => void;
declare const warn: (path: string, detail: string | string[] | unknown) => void;
declare const info: (path: string, detail: string | string[] | unknown) => void;
declare const debug: (path: string, detail: string | string[] | unknown) => void;
export declare const logger: {
    error: typeof error;
    warn: typeof warn;
    info: typeof info;
    debug: typeof debug;
};
export {};
