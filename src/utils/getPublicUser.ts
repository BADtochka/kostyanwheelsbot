import { PublicUser, User } from '@/types/User';

export const getPublicUser = (user: Partial<User>): PublicUser => {
  return {
    username: user.username || '',
    expire: user.expire || 0,
    status: user.status || 'disabled',
    subscription_url: user.subscription_url || '',
    used_traffic: user.used_traffic || '',
  };
};
