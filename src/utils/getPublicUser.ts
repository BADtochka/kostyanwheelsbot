import { PublicUser, User } from '@/types/user.api';

export const getPublicUser = (user: User): PublicUser => {
  return {
    username: user.username,
    expire: user.expire,
    status: user.status,
    subscription_url: user.subscription_url,
    used_traffic: user.used_traffic,
  };
};
