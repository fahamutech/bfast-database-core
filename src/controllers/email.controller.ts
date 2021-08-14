import {EmailAdapter} from '../adapters/email.adapter';
import {MailModel} from '../model/mail.model';

export class EmailController {
    constructor(private readonly emailAdapter: EmailAdapter) {
    }

    sendMail(mailModel: MailModel): Promise<any> {
        return this.emailAdapter.sendMail(mailModel);
    }
}
