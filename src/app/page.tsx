import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to <span className="text-indigo-600">NoCage</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Your unified platform for social networking, capsule marketplace, and business management.
            Connect, create, and grow with NoCage's integrated ecosystem.
          </p>
        </header>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* Social Hub */}
          <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow">
            <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Social Network</h3>
            <p className="text-gray-600 mb-4">Connect with like-minded individuals, share posts, and build your professional network.</p>
            <Link
              href="/social"
              className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Explore Social
            </Link>
          </div>

          {/* Capsule Marketplace */}
          <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Capsule Marketplace</h3>
            <p className="text-gray-600 mb-4">Discover and purchase digital products, tools, and creative assets from talented creators.</p>
            <Link
              href="http://localhost:3002"
              className="inline-block bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Browse Capsules
            </Link>
          </div>

          {/* Business Management */}
          <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4m0 0v-5a2 2 0 012-2h2a2 2 0 012 2v5m-6 0v-4a1 1 0 011-1h2a1 1 0 011 1v4m-6 0h6" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Business Management</h3>
            <p className="text-gray-600 mb-4">Manage your business operations, inventory, orders, and customer relationships efficiently.</p>
            <Link
              href="http://localhost:3003"
              className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Manage Business
            </Link>
          </div>
        </div>

        {/* Discovery Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
            Discover the NoCage Ecosystem
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">🚀 Featured Businesses</h3>
              <p className="text-gray-600 mb-4">
                Explore innovative businesses in our ecosystem. From tech startups to creative agencies,
                find inspiration and potential partnerships.
              </p>
              <Link
                href="/discover/businesses"
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Browse Businesses →
              </Link>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">💎 Top Capsules</h3>
              <p className="text-gray-600 mb-4">
                Discover the most popular digital products and tools created by our community.
                From design assets to productivity tools.
              </p>
              <Link
                href="/discover/capsules"
                className="text-purple-600 hover:text-purple-800 font-medium"
              >
                Explore Capsules →
              </Link>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Join NoCage?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Sign up now and get access to all our platforms with a single account.
          </p>
          <div className="space-x-4">
            <Link
              href="http://localhost:3001/api/auth/signin"
              className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="http://localhost:3001/api/auth/signin"
              className="inline-block border-2 border-indigo-600 text-indigo-600 px-8 py-3 rounded-lg text-lg font-medium hover:bg-indigo-600 hover:text-white transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}