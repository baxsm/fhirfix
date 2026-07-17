type SendArgs = {
    to: string;
    subject: string;
    html: string;
    text: string;
};
export declare function sendEmail({ to, subject, html, text }: SendArgs): Promise<void>;
export declare let lastTestEmail: SendArgs | null;
export declare function clearTestEmail(): void;
export {};
