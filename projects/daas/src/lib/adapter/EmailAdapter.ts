import {MailModel} from "../model/MailModel";

export interface EmailAdapter {
    sendMail(mailModel: MailModel): Promise<any>;
}
