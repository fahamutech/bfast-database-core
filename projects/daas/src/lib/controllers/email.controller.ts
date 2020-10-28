import {EmailAdapter} from '../adapters/email.adapter';
import {MailModel} from '../model/mail.model';

let emailAdapter: EmailAdapter;

export class EmailController {
  constructor(email: EmailAdapter) {
    emailAdapter = email;
  }

  sendMail(mailModel: MailModel): Promise<any> {
    return emailAdapter.sendMail(mailModel);
  }
}
