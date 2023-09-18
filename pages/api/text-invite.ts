import SMSClient from "@/modules/smsClient";

const client = new SMSClient();

export default async function handler(req: any, res: any) {
  const { name, placeNum, toTel } = req.body;
  const data = await client.sendQueueSuccess(name, placeNum, toTel);
  res.status(200).json(data);
}
