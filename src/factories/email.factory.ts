import {EmailAdapter} from '../adapters/email.adapter';
import {MailModel} from '../models/mail.model';

export class EmailFactory implements EmailAdapter {
  constructor() {
  }

  sendMail(mailModel: MailModel): Promise<any> {
    return Promise.reject('Not implemented yet');
  }

}
