import { AxiosError } from 'axios';

export const parseError = (error: AxiosError) => {
  return error.response?.data;
};
