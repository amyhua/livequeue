/* eslint-disable react/no-unescaped-entities */
'use client';
import Image from 'next/image'
import styles from './page.module.css';
import classNames from 'classnames';
import React, { useEffect, useState, useCallback } from 'react';
import Airtable from 'airtable';

if (!process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID) throw new Error(`Undefined base ID`);

Airtable.configure({
  apiKey: process.env.NEXT_PUBLIC_AIRTABLE_API_KEY
});
const base = Airtable.base(process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID);

function phoneFormat(input: string): string {//returns (###) ###-####
  input = input.replace(/\D/g,'');
  var size = input.length;
  if (size>0) {input="("+input}
  if (size>3) {input=input.slice(0,4)+") "+input.slice(4,11)}
  if (size>6) {input=input.slice(0,9)+"-" +input.slice(9)}
  return input;
}

type ErrorObj = { error: ErrorType, message: string; }

const ErrorMessage = ({ error }: { error: ErrorObj | string }) => (
  <div className='font-sans text-xs mb-4 mx-auto py-2 px-4 rounded-md bg-red-900 text-red-200'>
    <strong className='font-semibold'>We're sorry, something went wrong. Please let Ben know.</strong>
    <div className='my-1 text-xs text-red-300 font-normal'>
      {typeof error === 'string' ? error : error.message}
    </div>
  </div>
)

enum InviteStatus {
  InQueue = 'In Queue',
  InviteSent = 'Invite Sent',
  InviteAccepted = 'Invite Accepted - Arriving',
  InviteDeclined = 'Invite Declined - Not Arriving',
  InSession = 'IN SESSION',
  Done = 'DONE',
  CanceledInQueue = 'Canceled Self in Queue',
  CancelAsNoShow = 'Cancel Invite - Mark as No Show',
  Expired = 'Expire Invite - Event Finished'
}

enum ErrorType {
  PlaceError = 'Place Error',
  NoShow = 'No Show'
}

const cancelInvite = async (recordId: string) => {
  if (!recordId) return;
  const table = base.table('Live Queue');
  await table.update(recordId, {
    Status: InviteStatus.CanceledInQueue
  });
}

export default function Home(props: any) {
  const { searchParams: { invite: urlRecordId }} = props || {};
  const [recordId, setRecordId] = useState<string>(urlRecordId);
  const [name, setName] = useState('');
  const [tel, setTel] = useState('');
  const [error, setError] = useState('');
  const [numInQueue, setNumInQueue] = useState<number>();
  const [isNoShow, setIsNoShow] = useState(false);
  const [loadingPlaceInQueue, setLoadingPlaceInQueue] = useState(false);
  const [canceledPlaceInQueue, setCanceledPlaceInQueue] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [invited, setInvited] = useState(false);
  const [mailingListEmail, setMailingListEmail] = useState('');
  const [mailingListSignupError, setMailingListSignupError] = useState('');
  const [mailingListSignupSubmitting, setMailingListSignupSubmitting] = useState(false);
  const [mailingListSignupSubscribed, setMailingListSignupSubscribed] = useState(false);
  const [activeEventId, setActiveEventId] = useState('');
  const onMailingListSignup = async (e: any) => {
    e.preventDefault();
    if (!mailingListEmail) return;
    setMailingListSignupSubmitting(true);
    setMailingListSignupSubscribed(false);
    try {
      const table = base.table('Mailing List Signups');
      const findQ = await table.select({
        fields: ['Email', 'Phone', 'Queue'],
        filterByFormula: `Email = '${mailingListEmail}'`
      });
      const records = await findQ.all();
      if (!records.length) {
        await table.create({
          Name: name,
          Phone: tel,
          Email: mailingListEmail,
          ...(recordId ? {
            Queue: [recordId]
          } : {})
        });
      }
      setMailingListSignupSubscribed(true);
      setMailingListSignupError('');
    } catch(err) {
      setMailingListSignupError(String(err));
    } finally {
      setMailingListSignupSubmitting(false);
    }
  };
  const onChangeTel = (e: any) => {
    const val = e.target.value;
    setTel(phoneFormat(val));
  };
  const getPlaceNum = useCallback(async (tel: string, updateUrlToRecordId: boolean) => {
    setLoadingPlaceInQueue(true);
    try {
      const table = base.table('Live Queue');
      const query = await table.select({
        fields: ['Phone', 'Name', 'Created At'],
        filterByFormula: "AND({Created At} >= TODAY(), Status = 'In Queue')",
        sort: [{ field: 'Order'}]
      });
      const records = await query.all();
      let i = 0, done = false;
      while (!done && i < records.length) {
        if (records[i].get('Phone') === tel) {
          done = true;
          if (updateUrlToRecordId  && records[i].getId() !== recordId) {
            setRecordId(records[i].getId());
            if (window) window.location.replace(window.location.pathname + `?invite=${records[i].getId()}`);
          }
        }
        i++;
      }
      if (!done) {
        const query = table.select({
          fields: ['Phone', 'Name', 'Created At'],
          filterByFormula: `AND({Created At} >= TODAY(), Status = '${InviteStatus.CancelAsNoShow}', Phone = '${tel}')`,
          sort: [{ field: 'Created At'}]
        });
        const records = await query.all();
        if (records.length) {
          return Promise.reject({
            error: ErrorType.NoShow,
            message: 'Your place in the queue was cancelled as a No Show. Please (re)enter the queue to join the waitlist.'
          });
        }
        return Promise.reject({
          error: ErrorType.PlaceError,
          message: 'Invite Place N/A. Please (re)enter the queue to join the waitlist.'
        });
      }
      return i;
    } catch(err) {
      return Promise.reject(err);
    } finally {
      setLoadingPlaceInQueue(false);
    }
  }, [recordId]);
  const getOrCreateInvite = useCallback(async (name: string, tel: string) => {
    try {
      const table = base.table('Live Queue');
      const findQuery = table.select({
        filterByFormula: `AND(Phone = '${tel}', Status = '${InviteStatus.InQueue}', {Created At} >= TODAY())`
      });
      const found = await findQuery.all();
      if (found.length) {
        const num = await getPlaceNum(tel, true);
        return {
          placeNum: num
        };
      }
      const othersQuery = table.select({
        fields: ['Phone', 'Name', 'Created At', 'Order'],
        filterByFormula: `AND(Status = '${InviteStatus.InQueue}', {Created At} >= TODAY())`,
        sort: [{ field: 'Order', direction: 'desc' }]
      });
      const records = await othersQuery.all();
      let prevItemOrder: number = 0;
      if (records.length) {
        prevItemOrder = Number(records[0].fields.Order || 0);
      }
      const itemOrder = prevItemOrder + 1;
      const created = await table.create([
        {
          fields: {
            ['Name']: name,
            ['Phone']: tel,
            ['Status']: InviteStatus.InQueue,
            ['Order']: itemOrder,
            ...(
              activeEventId ? {
                ['Event']: [activeEventId]
              } : {}
            ),
          }
        }
      ]);
      return {
        ...created,
        placeNum: records.length + 1
      };
    } catch(err) {
      return Promise.reject(err);
    }
  }, [activeEventId, getPlaceNum]);
  const onInvite = async (e?: any) => {
    if (e) e.preventDefault();
    setInvited(false);
    setIsNoShow(false);
    setSubmitting(true);
    const body = {
      name: name || 'Anonymous',
      tel,
    };
    getOrCreateInvite(name, tel)
    .then(({ placeNum, ...resp }) => {
      setInvited(true);
      setNumInQueue(placeNum);
    })
    .catch(({ error, message }) => {
      if (error === ErrorType.NoShow) {
        return setIsNoShow(true);
      }
      setError(`${error}: ${message}`);
    })
    .finally(() => {
      setSubmitted(true);
      setSubmitting(false);
    })
  };
  const disabled = submitting || !(tel.length === '(###) ###-####'.length);
  const onRefresh = useCallback(async (e?: any) => {
    if (e) e.preventDefault();
    try {
      const num = await getPlaceNum(tel, false);
      setNumInQueue(num);
    } catch(err) {
      if ((err as ErrorObj).error === ErrorType.NoShow) {
        return setIsNoShow(true);
      }
      setError(String(err));
    }
  }, [getPlaceNum, tel]);
  const reenterQueue = () => {
    onInvite();
  };
  let interval: any | undefined;
  useEffect(() => {
    if (!submitted) return;
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    interval = setInterval(() => {
      onRefresh();
    }, 20 * 1000);
    return () => {
      if (interval) clearInterval(interval);
    }
  }, [submitted, onRefresh]);
  const getInviteByRecordId = useCallback(async (recordId: string) => {
    const table = base.table('Live Queue');
    const findQuery = await table.select({
      fields: ['Name', 'Phone', 'Status', 'Event'],
      filterByFormula: `AND({Created At} >= TODAY(), Status = '${InviteStatus.InQueue}')`,
    });
    const found = await findQuery.all();
    const record = found.find(record => record.id === recordId);
    if (record) {
      const { Status: qStatus, Phone: qTel, Name: qName } = record.fields;
      if (qTel) {
        setName(qName ? String(qName) : '');
        setTel(String(qTel));
        setInvited(true);
        setSubmitted(true);
        if (qStatus === InviteStatus.CanceledInQueue) {
          setCanceledPlaceInQueue(true);
        }
        try {
          const num = await getPlaceNum(String(qTel), false);
          setNumInQueue(num);
        } catch(err) {
          if ((err as ErrorObj).error === ErrorType.NoShow) {
            return setIsNoShow(true);
          }
          setError(String((err as ErrorObj).message));
        }
      }
    } else {
      setRecordId('');
    }
  }, [getPlaceNum]);
  const onCancelInvite = (e: any) => {
    e.preventDefault();
    cancelInvite(recordId)
    .then(() => {
      setCanceledPlaceInQueue(true);
    })
    .catch(err => {
      setError(String((err as ErrorObj).message));
    })
  };
  useEffect(() => {
    if (recordId) getInviteByRecordId(recordId);
  }, [recordId, getInviteByRecordId]);
  const loadActiveEvent = async () => {
    try {
      const table = base.table('Events');
      const query = table.select({
        fields: ['Event Name'],
        filterByFormula: `{Is Now?} = 1`,
        sort: [{ field: 'Created At', direction: 'desc'}]
      });
      const records = await query.all();
      if (records.length) {
        const eventId = records[0].id;
        setActiveEventId(eventId);
      }
    } catch(err) {
      console.error(err);
    }
  }
  useEffect(() => {
    loadActiveEvent();
    const onToggleHidden = (e: any) => {
      const isHidden = document.visibilityState !== "visible";
      if (isHidden) {
        if (interval) clearInterval(interval);
      } else {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        interval = setInterval(() => {
          onRefresh();
        }, 20 * 1000);
      }
    };
    document.addEventListener('visibilitychange', onToggleHidden);
    return () => {
      document.removeEventListener('visibilitychange', onToggleHidden);
    }
  }, []);
  return (
    <main className={styles.container}>
      <div>
        <Image alt="Beneficent Life Coaching & Tarot" height={100} width={400} className='invert inline-block text-center mb-5' src={require('@/public/logo.png')} />
      </div>
      {
        invited ? (
          <div>
            {
              (numInQueue || loadingPlaceInQueue || isNoShow || canceledPlaceInQueue) && (
                <div onClick={onRefresh} aria-label="Refresh place in line">
                <h2 className={classNames(
                  'cursor-pointer text-bold text-4xl max-w-xs mx-auto mb-6',
                  !error && !canceledPlaceInQueue && 'bg-white/10 hover:border-white focus:border-white border border-transparent transition-colors rounded-lg py-4'
                )}>
                  {
                    isNoShow ? (
                      <div className='text-base px-3'>
                        <h3>
                          I'm sorry, your place in line was canceled.
                        </h3>
                        <p>
                          An invite was sent but we could not find you there.
                        </p>
                        <a href="#" onClick={reenterQueue} className='text-yellow-500 underline block my-4 text-xl'>
                          Rejoin the queue
                        </a>
                      </div>
                    ) : canceledPlaceInQueue ? (
                      <div className='text-base px-3'>
                        <h3>
                          Your place in line has been canceled.
                        </h3>
                        <a href="#" onClick={reenterQueue} className='text-yellow-500 underline block my-4 text-xl'>
                          Rejoin the queue
                        </a>
                      </div>
                    ) : error ? (
                      <ErrorMessage error={error} />
                    ) : (
                      <>
                        <small className='block mt-2 text-lg mb-2 text-white/50'>
                          Place in Line
                        </small>
                        <div className='min-h-[75px]'>
                          #{numInQueue}{
                            numInQueue === 1 && <div className='text-2xl'>You're Next!</div>
                          }
                          <small className={classNames(
                            'block mt-2 text-base mb-2',
                            loadingPlaceInQueue ? 'text-gray-500' : 'text-yellow-500'
                          )}>
                            {
                              loadingPlaceInQueue ? 'Refreshing...' : 'Refresh'
                            }
                          </small>
                        </div>
                      </>
                    )
                  }
                </h2>
                </div>
              )
            }
            {
              !isNoShow && !canceledPlaceInQueue && (
                <>
                  <h2 className='text-xl mb-6 text-green-300'>
                    You are in the queue{name ? ', ' + name : ''}.
                  </h2>
                  <p className='text-lg mt-2 mb-4'>
                    This page will automatically refresh with your place in line.<br/>
                    You will also receive a text at {tel} when it's your turn.
                  </p>
                </>
              )
            }
            <div className='my-4'>
              <a className='mx-8 text-yellow-500 underline' href="/">Submit Another</a>
              {
                !canceledPlaceInQueue && (
                  <a onClick={onCancelInvite} className='ml-8 text-gray-400 hover:text-red-400 focus:text-red-400 underline' href="#">Cancel Reservation</a>
                )
              }
            </div>
          </div>
        ) : (
          <>
            <p className='mt-3 pt-6 border-t border-t-yellow-200 text-2xl text-yellow-200'>
              You are invited to a
            </p>
            <h1 className='text-3xl text-yellow-200'>
              Tarot Reading
            </h1>
            <p className='text-2xl pb-6 border-b border-b-yellow-200 mb-8 text-yellow-200'>
              with Beneficent.
            </p>
            <p className={classNames(
              styles.instruction,
              'mb-3 text-xl max-w-md'
            )}>
              Submit this form to join the waitlist for a tarot reading and receive a text when it's your turn.
            </p>
            <form onSubmit={onInvite}>
              <input name="name" value={name} onChange={e => setName(e.target.value)} className={classNames(
                styles.phoneInput,
                'rounded-md focus:outline-none mb-0 mt-4 text-lg',
                'border border-gray-500 transition-colors hover:border-white focus:border-white'
              )} type="text" placeholder="Your Name (optional)" />
              <input name="tel" value={tel} onChange={onChangeTel} className={classNames(
                styles.phoneInput,
                'rounded-md focus:outline-none text-lg',
                'border border-gray-500 transition-colors hover:border-white focus:border-white'
              )} type="tel" placeholder="Your Phone" />
              <button disabled={disabled} className={classNames(
                styles.submitBtn,
                'rounded-md mb-6 mx-auto text-xl py-2 disabled:bg-gray-700 disabled:text-gray-400 transition-colors'
              )} type="submit">
                { submitting ? 'Loading...' : 'Join the Queue'}
              </button>
              {
                error && <ErrorMessage error={error} />
              } 
              <p className='text-base leading-5 mt-2 text-gray-300'>
                US phone numbers only.<br/>
                Standard texting rates may apply.
              </p>
            </form>

          </>
        )
      }
      <div className={classNames('text-xl border-t-gray-600 border-t mb-4', {
        'mt-14 py-14': !invited,
        'mt-8 py-8': !invited
      })}>
        <p className={classNames(styles.instruction, 'text-xl')}>
          Receive email updates<br/>
          from Beneficent Life Coaching & Tarot
        </p>
        <form onSubmit={onMailingListSignup}>
          <input
            type="email"
            value={mailingListEmail}
            onChange={(e) => setMailingListEmail(e.target.value)}
            placeholder="Enter Your Email" className={classNames(
            styles.phoneInput,
            'rounded-md focus:outline-none mt-5 text-lg',
            'border border-gray-500 transition-colors hover:border-white focus:border-white'
          )} />
          <button className={classNames(
            styles.submitBtn,
            'rounded-md mb-6 mx-auto text-xl py-2 disabled:bg-gray-300',
          )} type="submit">{
            mailingListSignupSubmitting ? 'Submitting...' : 'Subscribe'
          }</button>
        </form>
        {
          mailingListSignupSubscribed && (
            <div className='mt-4 text-green-300'>
              ✓ You are successfully subscribed.
            </div>
          )
        }
      </div>
      {
        mailingListSignupError && <ErrorMessage error={mailingListSignupError} />
      }
      <div className='py-8'>
        <a className='text-center uppercase text-[#f4d662] border-[#f4d662] pb-2 pt-3 border-t border-b' href="//beneficent.coach" target="_blank">visit beneficent.coach</a>
      </div>
    </main>
  )
}
