# COIComply Data Retention and Deletion

Status: proposed operating standard. Legal and operational approval is required before publication.

## Proposed schedule

| Record | Active-service retention | After termination or request | Backup/log disposition |
|---|---|---|---|
| Uploaded COIs, endorsements, requirements, and vendor files | While needed for active monitoring | Block access promptly and delete from primary storage within 30 days | Residual encrypted backups targeted to expire within 90 days |
| Generated compliance reports | While the account is active | Export window of 30 days, then delete unless otherwise agreed | Backup expiration targeted within 90 days |
| Upload and document metadata | While the account is active | Delete or de-identify within 30 days, except minimal audit evidence | Security evidence retained up to 12 months |
| Account and authentication records | While the account is active | Delete or de-identify within 30 days, subject to security and dispute needs | Provider backup cycles apply |
| Billing, tax, contract, and payment records | Contract term | Retain seven years or as required by law | Secure deletion after the required period |
| Security and access logs | Rolling operational period | Retain 12 months unless needed for an investigation | Delete after investigation and legal holds end |
| Support communications | While needed to resolve the request | Delete or de-identify after 24 months unless linked to a dispute | Provider backup cycles apply |
| Prospect communications | While discussions remain active | Delete or de-identify after 24 months of inactivity | Provider backup cycles apply |

## Deletion workflow

1. Authenticate and verify the requester.
2. Confirm the account and document scope.
3. Apply a deletion hold only for fraud, security, payment dispute, litigation, or law.
4. Revoke active sessions when closing an account.
5. Mark affected records `deletion_pending`.
6. Delete source files from Uploadcare.
7. Remove active metadata and delivery capability.
8. Record completion using a non-content audit event.
9. Confirm completion to the requester.
10. Allow provider backups to expire under the documented cycle.

## Legal holds

A legal hold identifies its reason, scope, owner, start date, and review date. Review every hold at least every 90 days and remove it promptly when no longer required.

## Data minimization

- Collect only documents needed for COI review and monitoring.
- Discourage Social Security numbers, bank information, medical information, driver-license data, and unrelated employee records.
- Remove duplicates when a newer version makes them unnecessary.
- Do not retain public CDN URLs.
- Do not place document content in support tickets or email unless necessary and specifically approved.

## Decisions to confirm

- Whether 30 days after termination is operationally sufficient.
- Whether customers should receive a longer export window.
- Whether seven-year business-record retention matches accounting and tax requirements.
- Whether an order form or DPA may establish a different schedule.
