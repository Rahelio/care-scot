/**
 * Notifications — stub for future implementation.
 * Extend with email (Resend/Nodemailer) or SMS as needed.
 */

export interface NotificationPayload {
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail(payload: NotificationPayload): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    console.log("[Email]", payload);
    return;
  }
  // TODO: integrate email provider (e.g. Resend)
  throw new Error("Email provider not configured");
}

export async function notifyIncidentReported(opts: {
  managerEmail: string;
  incidentType: string;
  serviceUserName: string;
  incidentDate: string;
}): Promise<void> {
  await sendEmail({
    to: opts.managerEmail,
    subject: `Incident Reported: ${opts.incidentType}`,
    body: `An incident of type "${opts.incidentType}" has been reported for ${opts.serviceUserName} on ${opts.incidentDate}.`,
  });
}
