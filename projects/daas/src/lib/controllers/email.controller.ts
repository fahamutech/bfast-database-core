import {EmailAdapter} from "../adapter/EmailAdapter";
import {MailModel} from "../model/MailModel";

export class EmailController {
    constructor(private readonly _email: EmailAdapter) {
    }

    sendMail(mailModel: MailModel): Promise<any> {
        return this._email.sendMail(mailModel);
    }
}
