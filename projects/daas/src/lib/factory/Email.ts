import {EmailAdapter} from "../adapter/EmailAdapter";
import {MailModel} from "../model/MailModel";

export class Email implements EmailAdapter {
    constructor() {
    }

    sendMail(mailModel: MailModel): Promise<any> {
        return Promise.reject("Not implemented yet");
    }

}
