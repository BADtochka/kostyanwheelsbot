export const stringifyData = <T extends {}>(data: T) => {
  return new URLSearchParams(data).toString() as unknown as T;
};
