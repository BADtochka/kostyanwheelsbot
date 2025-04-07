export const convertBytes = (bytes: string) => {
  let parsedBytes = Number(bytes);
  if (Number.isNaN(parsedBytes)) return '💀';

  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (parsedBytes >= 1024 && i < units.length - 1) {
    parsedBytes /= 1024;
    i++;
  }
  return `${parsedBytes.toFixed(2)} ${units[i]}`;
};
