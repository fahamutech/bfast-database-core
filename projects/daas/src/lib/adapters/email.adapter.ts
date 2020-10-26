import {MailModel} from '../model/mail.model';

export interface EmailAdapter {
  sendMail(mailModel: MailModel): Promise<any>;
}
