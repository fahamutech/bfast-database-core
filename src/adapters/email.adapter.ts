import {MailModel} from '../model/mail.model';

export abstract class EmailAdapter {
  abstract sendMail(mailModel: MailModel): Promise<any>;
}
