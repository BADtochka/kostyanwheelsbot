export const getInviteTag = (messageText?: string) => {
  const match = String(messageText).match(/\/start (.+)/i);
  if (!match) return null;
  return match[1];
};
