type Email = {
    subject: string;
    html: string;
    text: string;
};
export declare function verificationEmail(url: string): Email;
export declare function resetPasswordEmail(url: string): Email;
export declare function magicLinkEmail(url: string, workspaceName?: string): Email;
export {};
