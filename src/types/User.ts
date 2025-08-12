export type Token = {
  access_token: string;
  token_type: string;
};

export type AdminTokenRequest = {
  grant_type?: string;
  username: string;
  password: string;
  scope?: string;
  client_id?: string;
  client_secret?: string;
};

export type AdminTokenResponse = Token;

export interface Admin {
  username: string;
  is_sudo: boolean;
  telegram_id: number;
  discord_webhook: string;
}

export interface Proxies {}
export interface Inbounds {}
export interface ExcludedInbounds {}

export interface User {
  proxies: Proxies;
  expire: string | 0;
  data_limit: number;
  data_limit_reset_strategy: string;
  inbounds: Inbounds;
  note: string;
  sub_updated_at: string;
  sub_last_user_agent: string;
  online_at: string;
  on_hold_expire_duration: number;
  on_hold_timeout: string;
  auto_delete_in_days: number;
  username: string;
  status: 'active' | 'disabled' | 'on_hold' | 'limited' | 'expired';
  used_traffic: string;
  lifetime_used_traffic: number;
  created_at: string;
  links: any[];
  subscription_url: string;
  excluded_inbounds: ExcludedInbounds;
  admin: Admin;
}

export type UsersResponse = {
  total: number;
  users: User[];
};

export type PublicUser = Pick<User, 'expire' | 'subscription_url' | 'status' | 'username' | 'used_traffic'>;

export type RenewUserRequest = {
  expire: number;
};

export type RenewUserResponse = User;

export type DisableUserRequest = {
  status: PublicUser['status'];
};

export type DisableUserResponse = User;

export type UpdateUserRequest = Partial<PublicUser>;

export type CreateUserRequest = Required<Pick<User, 'username'>> & Partial<User>;

export type CreateUserResponse = User;
