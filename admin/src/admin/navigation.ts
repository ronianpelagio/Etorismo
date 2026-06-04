export const navPages = [
  'dashboard',
  'artifacts',
  'users',
  'reviews',
  'announcements',
  'events',
  'settings',
] as const;

export type PageKey = (typeof navPages)[number];

export const pageTitleMap: Record<PageKey, string> = {
  dashboard: 'Dashboard',
  artifacts: 'Artifacts',
  users: 'Users',
  reviews: 'Ratings & Reviews',
  announcements: 'Announcements',
  events: 'Events',
  settings: 'Settings',
};
