const {
  NEXT_PUBLIC_TWILIO_SID: smsSid = 'SK89c4c9d5c7db3794da7318275b145c7a',
  NEXT_PUBLIC_TWILIO_AUTH_TOKEN: smsAuthToken = '46IdiuxUkkK9pd6at0MaX6xqDlO0asuu',
  NEXT_PUBLIC_TWILIO_TEL: smsTel = '+18559109457'
} = process.env;

const TWILIO_ACCOUNT_SID = 'SK89c4c9d5c7db3794da7318275b145c7a';
const TWILIO_AUTH_TOKEN = '46IdiuxUkkK9pd6at0MaX6xqDlO0asuu';

const twilioClient = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

export default class SMSClient {
  sendMessage(toTel: string, message: string) {
    console.log('process.env', process.env)
    const toTelWithPlusCountryCode = `+1${toTel.replace(`+1`,'').replace(/\D/g,'')}`
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    console.log('twilioClient', twilioClient)

    twilioClient.messages
    .create({
      body: message,
      from: smsTel,
      to: toTelWithPlusCountryCode,
    })

    // return fetch(url, {
    //   method: 'POST',
    //   body: new URLSearchParams({
    //     From: smsTel,
    //     Body: message,
    //     To: toTelWithPlusCountryCode
    //   }),
    //   // `From=${smsTel}&Body=${message}&To=${toTelWithPlusCountryCode}`)
    //   headers: {
    //     'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
    //   }
    // })
    //   .then((message: any) => console.log('Sent!', message, message?.sid))
  }
  sendQueueSuccess = (name: string, placeNum: number | string, toTel: string) => {
    const template = `You are now #${(placeNum + 1)} in the queue for a Beneficent tarot reading, ${name}! We will text you when Ben is ready for you. Text CANCEL to decline your invitation.`;
    return this.sendMessage(toTel, template);
  }
}

function constructor() {
  throw new Error('Function not implemented.');
}
