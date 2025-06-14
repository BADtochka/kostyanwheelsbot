export type SendToOwner = {
  type?: 'document' | 'photo' | 'text';
  content: string;
  senderName: string;
};
