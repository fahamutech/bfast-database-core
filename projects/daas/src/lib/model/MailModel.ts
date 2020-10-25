export interface MailModel {
    from: string;
    to: string;
    subject: string;
    body: string;
    attachments?: any[];
}
