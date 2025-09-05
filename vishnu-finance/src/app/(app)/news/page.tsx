import Link from "next/link";
import { 
  Newspaper, 
  ArrowLeft, 
  Info,
  TrendingUp,
  Globe,
  Clock
} from "lucide-react";

export default function NewsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <Link 
                href="/" 
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                  <Newspaper className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financial News</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Stay updated with relevant financial insights</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Information Section */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                What You Can Do Here
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-200">
                <div>
                  <h4 className="font-medium mb-2">📰 Stay Informed</h4>
                  <ul className="space-y-1">
                    <li>• Market trends and analysis</li>
                    <li>• Economic policy updates</li>
                    <li>• Investment opportunities</li>
                    <li>• Personal finance tips</li>
                    <li>• Tax and regulatory changes</li>
                    <li>• Global financial news</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">🎯 Personalized Feed</h4>
                  <ul className="space-y-1">
                    <li>• Custom news preferences</li>
                    <li>• Keyword-based filtering</li>
                    <li>• Source selection</li>
                    <li>• Real-time updates</li>
                    <li>• Save important articles</li>
                    <li>• Share insights with others</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* News Feed */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Latest Financial News</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Curated news relevant to your financial interests</p>
          </div>
          
          <div className="p-6">
            <div className="text-center py-12">
              <Newspaper className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">News Feed Coming Soon</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                We're working on bringing you personalized financial news and insights. This feature will help you make informed financial decisions.
              </p>
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                  <Globe className="w-4 h-4" />
                  <span>Global Markets</span>
                </div>
                <div className="flex items-center space-x-1">
                  <TrendingUp className="w-4 h-4" />
                  <span>Investment Tips</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>Real-time Updates</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-8 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-4">
            💡 How to Use Financial News Effectively
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-yellow-800 dark:text-yellow-200">
            <div>
              <h4 className="font-medium mb-2">📊 Smart News Consumption</h4>
              <ul className="space-y-1">
                <li>• Verify information from multiple sources</li>
                <li>• Focus on news relevant to your investments</li>
                <li>• Don't make hasty decisions based on headlines</li>
                <li>• Consider the long-term impact of news</li>
                <li>• Consult with financial advisors when needed</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">🎯 Actionable Insights</h4>
              <ul className="space-y-1">
                <li>• Use news to inform your investment strategy</li>
                <li>• Stay updated on tax and regulatory changes</li>
                <li>• Monitor market trends for opportunities</li>
                <li>• Learn from expert analysis and opinions</li>
                <li>• Build a diversified news consumption habit</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
