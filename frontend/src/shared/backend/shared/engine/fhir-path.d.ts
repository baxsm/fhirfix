export declare function resolveParent(resource: unknown, path: string): {
    parent: Record<string, unknown> | undefined;
    key: string;
    index?: number;
};
export declare function getAtPath(resource: unknown, path: string): unknown;
export declare function setAtPath(resource: unknown, path: string, value: unknown): boolean;
