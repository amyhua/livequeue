import Airtable from "airtable";

Airtable.configure({
  apiKey: process.env.AIRTABLE_API_KEY
});

if (!process.env.AIRTABLE_BASE_ID) throw new Error(`Undefined airtable base ID`);

const airtableBase = Airtable.base(process.env.AIRTABLE_BASE_ID);

export default airtableBase;
