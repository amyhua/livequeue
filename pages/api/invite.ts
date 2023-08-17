import airtableBase from "@/modules/airtable";
import { IncomingMessage, ServerResponse } from "http";

const createInvite = async (name: string, tel: string) => {
  try {
    const resp = await airtableBase.makeRequest({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        records: [{
          fields: {
            ['Name']: name,
            ['Phone']: tel
          }
        }]
      })
    });
    return Promise.resolve(resp);
  } catch(err) {
    console.error('Error occurred:', err);
    return Promise.reject(err);
  }
}

export default function handler(req: any, res: any) {
  const { name, tel } = req.body;
  // res.status(200).json({ name, tel });
  createInvite(name, tel)
  .then(data => {
    res.status(200).json(data);
  })
  .catch((err) => {
    res.status(500).json(err);
  })
}
