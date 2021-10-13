import {EmailAdapter} from '../adapters/email.adapter';
import {MailModel} from '../model/mail.model';


export async function sendMail(
    mailModel: MailModel,
    emailAdapter: EmailAdapter
): Promise<any> {
    return emailAdapter.sendMail(mailModel);
}
