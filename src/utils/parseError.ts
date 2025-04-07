import { AxiosError } from 'axios';

export const parseError = (error: AxiosError | Error) => {
  if ('response' in error) {
    return error.response?.data;
  }

  return error;
};
