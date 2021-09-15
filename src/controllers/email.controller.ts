import {EmailAdapter} from '../adapters/email.adapter';
import {MailModel} from '../model/mail.model';

export class EmailController {
    constructor() {
    }

    sendMail(
        mailModel: MailModel,
        emailAdapter: EmailAdapter
    ): Promise<any> {
        return emailAdapter.sendMail(mailModel);
    }
}
