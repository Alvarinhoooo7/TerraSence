# SoyMomo Customer Service Platform Backend

## Functions

- Conection with watch cloud
- TCP Commands
- List TCP Commands
- Terminate Subscription
- Pause / Unpause Subscription
- Power Off Watch
- Reset Watch
- Info retrieval for:
  - Sim (including subscriptions)
  - Watch
  - Tablet

## Docs

### Subscription

#### Terminate

The terminate subscription function can be done for mainly three reasons:

1. Customer Service decision  
   In this case the subscription is terminated because the customer service employee deemed it necessary. The subscription is cancelled in the MVNO provider and our database is updated to reflect the 'TERMINATED' state of the subscription.

2. User Decision :gear:  
   Similar to the one before, but this time the user cancels his/her own subscription via his/her mobile App. The subscription is terminated in the MVNO provider and our database is updated.

3. Non-Payment :gear:  
   In this case, the request is being sent from an automated script that checks three times if the customer can pay for the subscription. Before this call the subscription should be in the 'SUSPENDED' state while the payment is being processed. If the payment method fails a third time, this function is called for a termination of the subscription, denoting a payment failed status. Again, the MVNO provider is updated so the subscription goes to a 'NON-PAYMENT' state, and our database is updated, again, with a 'NON-PAYMENT' state.

This function updates the state of the subscription to 5 in ALAI (6 if it was pre-activated).  
In Gigs it uses the same endpoint as pause since the terminate endpoint is deprecated.

### Pause

The pause subscription pauses the subscription provided differently depending on the service:

- **ALAI**: It updates the state to Non-payment(18) indefenetly, where the subscriber doesnt have access to paid features.
- **GIGS**: It puts the subscription in a "cancelled" state. The next payment period GIGS will try to access the payment method. If it fails, the subscription will be automatically terminated.

## Corollary

- :gear: : In development

## Developer Docs

### Start

- Development: `npm run dev`
- Production: `npm start`

### Deploy

We have a pipeline that pushes changes to AWS Lightsail from the development branch and from the main branch. Both have the same pipeline steps:

- Build: Fetch changes, set credentials, fetch secrets and set environment variables.
- Deploy to lightsail
