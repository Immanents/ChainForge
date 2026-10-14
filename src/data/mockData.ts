export const kpis = [
  {
    label: "Community members",
    value: "128,420",
    change: "+8.4%",
    note: "vs. previous 30 days",
    icon: "users",
    data: [23, 25, 24, 29, 31, 33, 38, 41, 43, 48],
  },
  {
    label: "Community growth",
    value: "9,842",
    change: "+12.1%",
    note: "new members this period",
    icon: "trend",
    data: [17, 21, 19, 28, 25, 34, 31, 38, 36, 45],
  },
  {
    label: "Engagement",
    value: "14.8%",
    change: "+2.3%",
    note: "across all platforms",
    icon: "activity",
    data: [38, 31, 35, 32, 41, 39, 45, 42, 48, 52],
  },
  {
    label: "Sentiment",
    value: "78%",
    change: "+4.2%",
    note: "positive conversations",
    icon: "heart",
    data: [32, 34, 30, 36, 39, 38, 42, 46, 45, 51],
  },
  {
    label: "Mentions",
    value: "6,284",
    change: "+18.6%",
    note: "2,104 unique authors",
    icon: "message",
    data: [16, 18, 24, 21, 29, 27, 34, 31, 43, 46],
  },
  {
    label: "Content performance",
    value: "4.7x",
    change: "+0.6x",
    note: "avg. engagement lift",
    icon: "sparkles",
    data: [21, 24, 27, 25, 31, 35, 33, 40, 44, 49],
  },
]

export const activity = [
  {
    platform: "X",
    user: "0xMason",
    event: "Positive mention",
    text: "Nova's intent layer is the cleanest cross-chain experience I've used this year.",
    time: "4 min ago",
    sentiment: "Positive",
    importance: "High",
  },
  {
    platform: "Discord",
    user: "Nova Builders",
    event: "Product question",
    text: "How does the new validator delegation flow affect existing positions?",
    time: "12 min ago",
    sentiment: "Neutral",
    importance: "Medium",
  },
  {
    platform: "Telegram",
    user: "Community Alpha",
    event: "Topic emerging",
    text: "Token utility discussion volume is accelerating after the roadmap update.",
    time: "28 min ago",
    sentiment: "Positive",
    importance: "High",
  },
  {
    platform: "X",
    user: "AishaOnchain",
    event: "Influencer mention",
    text: "Watching Nova Protocol closely. Their developer traction is becoming hard to ignore.",
    time: "41 min ago",
    sentiment: "Positive",
    importance: "High",
  },
  {
    platform: "Discord",
    user: "support-thread",
    event: "Community complaint",
    text: "Three users reported a delay when claiming testnet rewards.",
    time: "1 hr ago",
    sentiment: "Negative",
    importance: "High",
  },
  {
    platform: "Telegram",
    user: "Nova Vietnam",
    event: "Token discussion",
    text: "Members are comparing staking mechanics and asking for clearer APY documentation.",
    time: "2 hr ago",
    sentiment: "Neutral",
    importance: "Medium",
  },
]

export const alerts = [
  {
    title: "Token utility discussion up 34%",
    description:
      "Conversation volume accelerated across X and Telegram in the last 6 hours.",
    severity: "Opportunity",
    time: "8 min ago",
  },
  {
    title: "Repeated reward claim issue",
    description:
      "12 similar messages detected in Discord. Product response recommended.",
    severity: "Critical",
    time: "34 min ago",
  },
  {
    title: "Major KOL mentioned Nova",
    description:
      "Aisha Chen shared a positive roadmap analysis with 84K followers.",
    severity: "High",
    time: "1 hr ago",
  },
  {
    title: "Sentiment improved after AMA",
    description:
      "Positive sentiment rose from 68% to 79% following yesterday's community AMA.",
    severity: "Insight",
    time: "3 hr ago",
  },
]

export const kols = [
  {
    name: "Aisha Chen",
    handle: "@aishaonchain",
    platform: "X",
    followers: "84.2K",
    engagement: "6.8%",
    relevance: 96,
    mentions: 8,
    sentiment: "Positive",
    category: "DeFi",
    region: "Singapore",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop",
  },
  {
    name: "Marcus Vale",
    handle: "@marcus_web3",
    platform: "X",
    followers: "142K",
    engagement: "4.9%",
    relevance: 92,
    mentions: 3,
    sentiment: "Positive",
    category: "Infrastructure",
    region: "UK",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop",
  },
  {
    name: "Lena Ortiz",
    handle: "@lena_builds",
    platform: "X",
    followers: "38.5K",
    engagement: "8.4%",
    relevance: 89,
    mentions: 12,
    sentiment: "Positive",
    category: "Developers",
    region: "USA",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop",
  },
  {
    name: "Chain Research",
    handle: "@chainresearch",
    platform: "X",
    followers: "218K",
    engagement: "3.7%",
    relevance: 85,
    mentions: 2,
    sentiment: "Neutral",
    category: "Research",
    region: "Global",
    avatar:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=120&h=120&fit=crop",
  },
  {
    name: "DevRel DAO",
    handle: "@devreldao",
    platform: "Discord",
    followers: "26.8K",
    engagement: "11.2%",
    relevance: 82,
    mentions: 6,
    sentiment: "Positive",
    category: "Developers",
    region: "Global",
    avatar:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&h=120&fit=crop",
  },
  {
    name: "Niko Labs",
    handle: "@nikolabs",
    platform: "X",
    followers: "67.1K",
    engagement: "5.6%",
    relevance: 79,
    mentions: 4,
    sentiment: "Neutral",
    category: "L2 Ecosystem",
    region: "Germany",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop",
  },
]

export const campaigns = [
  {
    name: "Intent Layer Launch",
    status: "Active",
    dates: "Mar 04 – Apr 12",
    goal: "Product awareness",
    budget: "$42,000",
    reach: "1.2M",
    engagement: "8.7%",
    progress: 68,
  },
  {
    name: "Nova Builders Season 2",
    status: "Active",
    dates: "Mar 18 – May 30",
    goal: "Developer adoption",
    budget: "$28,500",
    reach: "482K",
    engagement: "12.4%",
    progress: 42,
  },
  {
    name: "Community AMA Series",
    status: "Paused",
    dates: "Feb 10 – Apr 20",
    goal: "Community trust",
    budget: "$12,000",
    reach: "218K",
    engagement: "16.1%",
    progress: 75,
  },
  {
    name: "Testnet Momentum",
    status: "Completed",
    dates: "Jan 08 – Feb 28",
    goal: "Testnet activity",
    budget: "$35,000",
    reach: "1.8M",
    engagement: "10.8%",
    progress: 100,
  },
  {
    name: "APAC Ecosystem Week",
    status: "Draft",
    dates: "May 06 – May 14",
    goal: "Regional growth",
    budget: "$18,000",
    reach: "—",
    engagement: "—",
    progress: 12,
  },
]

export const contentDrafts = [
  {
    content:
      "Cross-chain shouldn't mean cross-your-fingers. Nova's new intent layer...",
    platform: "X",
    status: "Draft",
    date: "Today, 10:24",
    author: "Maya Chen",
    approval: "Awaiting review",
  },
  {
    content:
      "A technical deep dive into how Nova validators coordinate intents...",
    platform: "LinkedIn",
    status: "Scheduled",
    date: "Mar 26, 09:00",
    author: "Alex Morgan",
    approval: "Approved",
  },
  {
    content:
      "This week in the Nova ecosystem: 14 integrations, 8.2K new wallets...",
    platform: "X",
    status: "Draft",
    date: "Mar 24, 16:40",
    author: "Nova AI",
    approval: "Needs edits",
  },
  {
    content:
      "Join us Thursday for an open community call with the protocol team...",
    platform: "Telegram",
    status: "Published",
    date: "Mar 23, 12:15",
    author: "Sam Rivera",
    approval: "Approved",
  },
]

export const navItems = [
  { label: "Overview", icon: "overview" },
  { label: "Project", icon: "project" },
  { label: "Community", icon: "community" },
  { label: "Content Studio", icon: "content" },
  { label: "KOLs", icon: "kols" },
  { label: "Campaigns", icon: "campaigns" },
  { label: "Analytics", icon: "analytics" },
] as const
