// OPEN SOURCE & GITHUB — from authentic profile.
export type GithubStats = { label: string; value: string }
export type GithubContribution = { repo: string; what: string; link: string }
export type GithubProfile = {
  user: string
  url: string
  stats: GithubStats[]
  contributions?: GithubContribution[]
}

export const github: GithubProfile = {
  user: 'Saimanoj2325',
  url: 'https://github.com/Saimanoj2325',
  stats: [
    { label: 'Public repos', value: '18+' },
    { label: 'Problems Solved', value: '400+' },
  ],
}
