export const parseUserLinks = (userLinks: string | null) => {
  if (!userLinks) return [];

  return userLinks.split('\n').map((link) => {
    const url = new URL(link);

    return `> ${url.hash.replace('#', '')}\`\`\`${link}\`\`\` >`;
  });
};
