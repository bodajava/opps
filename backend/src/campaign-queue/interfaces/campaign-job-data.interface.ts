export interface CampaignJobData {
  campaignId: string;
  recipients: string[];
  subject: string;
  content: string;
  senderName?: string;
  senderEmail?: string;
}
