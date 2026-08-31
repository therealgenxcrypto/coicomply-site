# COIComply Incident Response Runbook

Status: internal operating draft. Do not publish this runbook as a contractual security promise.

## Severity

| Severity | Example | Internal response target |
|---|---|---|
| SEV-1 Critical | Confirmed unauthorized document access, exposed secret, destructive account compromise | Immediate containment |
| SEV-2 High | Suspected cross-account access, malware delivered to a reviewer, evidence of authentication bypass | Same business day |
| SEV-3 Moderate | Misdirected email without content, repeated failed access attempts, provider degradation | Within one business day |
| SEV-4 Low | Policy weakness without evidence of exposure | Scheduled remediation |

These are internal goals, not customer service-level guarantees.

## Roles

- Incident lead: coordinates response and decisions.
- Technical lead: containment, evidence preservation, and remediation.
- Privacy/legal lead: notification analysis and privilege.
- Communications owner: customer and provider communications.
- Recorder: incident timeline and decision log.

One person may fill several roles during the founding stage, but every role must be assigned before launch.

## Response sequence

1. Receive and timestamp the report.
2. Classify severity and affected systems.
3. Preserve logs and evidence without copying document contents unnecessarily.
4. Contain: revoke sessions, rotate secrets, disable unsigned delivery, isolate functions, or suspend uploads.
5. Determine affected data, customers, time window, and jurisdictions.
6. Engage relevant providers and require incident details.
7. Remediate the root cause and test the fix.
8. Determine contractual and legal notification duties with counsel.
9. Communicate verified facts without speculation.
10. Record corrective actions, owners, and deadlines.

## Immediate containment checklist

- Disable the affected endpoint or deployment.
- Revoke compromised Supabase sessions.
- Rotate affected Uploadcare, Supabase, Resend, GitHub, or Cloudflare credentials.
- Review Git history and deployment logs for secret exposure.
- Disable public Uploadcare delivery if unexpectedly enabled.
- Preserve relevant provider and authentication logs.
- Prevent deletion of relevant evidence.
- Do not download or redistribute more customer documents than necessary.

## Customer notification content

When notification is required, state:

- what happened and when;
- what information was involved;
- what containment occurred;
- what the customer should do;
- how COIComply can be contacted;
- when the next update will be provided.

Counsel determines statutory timing and required content. Do not promise a fixed public notification deadline until jurisdictions and contracts are known.

## Post-incident review

Complete within ten business days after containment:

- root cause and control failure;
- scope, impact, and timeline;
- notification analysis;
- remediation completed;
- remaining actions and owners;
- policy, training, and provider changes;
- verification results.
