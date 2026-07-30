import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

const NAV_ITEMS = [
  {
    title: 'Sessions',
    href: '/sessions',
    description: 'Create and manage group strengths sessions. Share a join link or QR code with participants so they can respond to themed prompts in real time.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    bg: 'bg-brand-50',
    iconColor: 'text-brand-500',
    border: 'border-brand-100',
    hoverBorder: 'hover:border-brand-300',
  },
  {
    title: 'Participants',
    href: '/participants',
    description: 'View and manage all participants. See CliftonStrengths results, generate Personal Insights and custom reports, and review completed worksheets.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    bg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    border: 'border-emerald-100',
    hoverBorder: 'hover:border-emerald-300',
  },
  {
    title: 'Teams',
    href: '/teams',
    description: 'Organize participants into teams. Manage team membership and structure to keep groups easy to find and work with.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    bg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    border: 'border-blue-100',
    hoverBorder: 'hover:border-blue-300',
  },
  {
    title: 'Themes and Reports',
    href: '/themes',
    description: 'Build custom worksheet themes and create reports that map strengths content to your participants. Add and manage the prompts coaches use in sessions.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    bg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    border: 'border-amber-100',
    hoverBorder: 'hover:border-amber-300',
  },
  {
    title: 'LMS Learners',
    href: '/lms-learners',
    description: 'Track learners who have accessed your LMS-linked content. Monitor engagement and see which participants have completed self-paced strengths activities.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    bg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    border: 'border-purple-100',
    hoverBorder: 'hover:border-purple-300',
  },
]

export default function HomePage() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-2">Where would you like to go?</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              to={item.href}
              className={`group flex gap-4 p-5 bg-white rounded-2xl border ${item.border} ${item.hoverBorder} shadow-sm hover:shadow-md transition-all`}
            >
              <div className={`flex-shrink-0 w-11 h-11 rounded-xl ${item.bg} ${item.iconColor} flex items-center justify-center`}>
                {item.icon}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 group-hover:text-gray-700 mb-1">{item.title}</div>
                <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  )
}
